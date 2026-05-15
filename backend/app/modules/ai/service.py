"""High-level AI operations.

Pure async functions over plain dicts/strings. The HTTP layer adapts these into
DB rows and SSE streams. Keeping this layer pure makes the CLI scripts trivial.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, AsyncIterator

from app.common.utils import safe_json_loads
from app.core.config import settings
from app.core.exceptions import UpstreamAIError
from app.modules.ai.client import get_client, make_generation_config
from app.modules.ai.prompts import extraction_v1, inference_v1, jd_distill_v1, search_v1
from app.modules.ai.schemas import (
    ExtractedProfile,
    InferredSkill,
    SearchResult,
    TeamBuildResult,
)

logger = logging.getLogger("skillshub.ai")


# ────────────────────────────────────────────────────────────────────────────
# 1. RESUME EXTRACTION
# ────────────────────────────────────────────────────────────────────────────

async def extract_resume(resume_text: str) -> ExtractedProfile:
    """Single Gemini call returning the structured profile JSON."""
    prompt = extraction_v1.build_prompt(resume_text)
    client = get_client()
    try:
        # google-genai is sync; run in a thread to avoid blocking the event loop.
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL_SHOWCASE,
            contents=prompt,
            config=make_generation_config(temperature=0.1),
        )
    except Exception as e:
        logger.exception("extract_resume gemini call failed")
        raise UpstreamAIError("Resume extraction failed") from e

    text = (response.text or "").strip()
    try:
        data = safe_json_loads(text)
    except json.JSONDecodeError as e:
        logger.error("extract_resume invalid JSON: %s", text[:500])
        raise UpstreamAIError("AI returned invalid JSON for extraction") from e

    try:
        return ExtractedProfile.model_validate(data)
    except Exception as e:
        logger.error("extract_resume schema validation failed: %s", e)
        raise UpstreamAIError("AI returned a profile that didn't match the schema") from e


# ────────────────────────────────────────────────────────────────────────────
# 2. INFERRED SKILLS
# ────────────────────────────────────────────────────────────────────────────

async def infer_related_skills(explicit_skills: list[dict]) -> list[InferredSkill]:
    """Returns at most 5 high-confidence inferred skills."""
    if not explicit_skills:
        return []
    prompt = inference_v1.build_prompt(explicit_skills)
    client = get_client()
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL_LIGHT,
            contents=prompt,
            config=make_generation_config(temperature=0.3),
        )
    except Exception as e:
        logger.exception("infer_related_skills gemini call failed")
        # Inference is non-critical — degrade gracefully.
        return []

    text = (response.text or "").strip()
    try:
        data = safe_json_loads(text)
    except json.JSONDecodeError:
        logger.warning("infer_related_skills invalid JSON: %s", text[:300])
        return []

    if not isinstance(data, list):
        return []

    # Drop dupes against explicit list (case-insensitive name match).
    explicit_names = {s["name"].lower() for s in explicit_skills}
    out: list[InferredSkill] = []
    for item in data[:5]:
        try:
            skill = InferredSkill.model_validate(item)
        except Exception:
            continue
        if skill.name.lower() in explicit_names:
            continue
        if skill.confidence < 0.7:
            continue
        out.append(skill)
    return out


# ────────────────────────────────────────────────────────────────────────────
# 3a. JD DISTILLATION
# ────────────────────────────────────────────────────────────────────────────

async def distill_jd_to_query(jd_text: str) -> str:
    """Compress a verbose job description into a single hiring query (<=200 chars).

    Uses the light Gemini model with low temperature — this is a deterministic
    rewriting task, not creative ranking. Plain text out, not JSON.
    """
    prompt = jd_distill_v1.build_prompt(jd_text)
    client = get_client()
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL_LIGHT,
            contents=prompt,
            config=make_generation_config(
                response_mime_type="text/plain",
                temperature=0.1,
            ),
        )
    except Exception as e:
        logger.exception("distill_jd_to_query gemini call failed")
        raise UpstreamAIError("JD distillation failed") from e

    text = (response.text or "").strip().strip('"').strip("'").strip()
    # Collapse any accidental multi-line output to a single line.
    text = " ".join(text.split())
    if not text:
        raise UpstreamAIError("JD distillation produced an empty query")
    # Hard cap defensively — search prompt expects <=500 chars.
    return text[:300]


# ────────────────────────────────────────────────────────────────────────────
# 3. SEMANTIC SEARCH (streaming)
# ────────────────────────────────────────────────────────────────────────────

_OBJECT_RE = re.compile(r"\{[^{}]*\}", re.DOTALL)


def _iter_complete_objects(buffer: str) -> tuple[list[dict], str]:
    """Walk a streaming JSON array buffer and yield every complete top-level object.

    Returns (objects, remaining_buffer). Tracks brace depth + string state to handle
    nested objects (e.g. evidence_snippets contains braces). The remaining_buffer
    keeps everything from the last incomplete object onward.
    """
    objects: list[dict] = []
    depth = 0
    in_string = False
    escape = False
    start: int | None = None
    last_complete_end = -1

    for i, ch in enumerate(buffer):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                snippet = buffer[start : i + 1]
                try:
                    objects.append(json.loads(snippet))
                    last_complete_end = i
                except json.JSONDecodeError:
                    pass
                start = None

    remaining = buffer[last_complete_end + 1 :] if last_complete_end >= 0 else buffer
    return objects, remaining


async def stream_search_results(
    query: str,
    candidates: list[dict],
    limit: int,
    temporal_context: dict[str, str],
) -> AsyncIterator[SearchResult]:
    """Yields SearchResult objects one at a time as Gemini streams its JSON array.

    The Gemini Python SDK is synchronous; we iterate the chunks in a worker thread and
    forward parsed objects via an asyncio.Queue.
    """
    prompt = search_v1.build_prompt(query, candidates, limit, temporal_context)
    client = get_client()

    queue: asyncio.Queue[SearchResult | None | Exception] = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def _producer() -> None:
        try:
            stream = client.models.generate_content_stream(
                model=settings.GEMINI_MODEL_SHOWCASE,
                contents=prompt,
                config=make_generation_config(temperature=0.2),
            )
            buffer = ""
            seen = 0
            for chunk in stream:
                piece = getattr(chunk, "text", None) or ""
                if not piece:
                    continue
                buffer += piece
                objs, buffer = _iter_complete_objects(buffer)
                for obj in objs:
                    if seen >= limit:
                        break
                    try:
                        result = SearchResult.model_validate(obj)
                    except Exception:
                        continue
                    seen += 1
                    asyncio.run_coroutine_threadsafe(queue.put(result), loop).result()
                if seen >= limit:
                    break
        except Exception as exc:  # noqa: BLE001
            logger.exception("stream_search_results producer failed")
            asyncio.run_coroutine_threadsafe(queue.put(exc), loop).result()
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop).result()

    task = asyncio.create_task(asyncio.to_thread(_producer))

    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise UpstreamAIError("Search streaming failed") from item
            yield item
    finally:
        await task


async def rank_candidates_non_streaming(
    query: str,
    candidates: list[dict],
    limit: int,
    temporal_context: dict[str, str],
) -> list[SearchResult]:
    """Non-streaming convenience used by the CLI script. Calls the same prompt
    and parses the full JSON array in one shot.
    """
    prompt = search_v1.build_prompt(query, candidates, limit, temporal_context)
    client = get_client()
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL_SHOWCASE,
            contents=prompt,
            config=make_generation_config(temperature=0.2),
        )
    except Exception as e:
        raise UpstreamAIError("Search failed") from e

    text = (response.text or "").strip()
    try:
        data = safe_json_loads(text)
    except json.JSONDecodeError as e:
        raise UpstreamAIError("AI returned invalid JSON for search") from e

    if not isinstance(data, list):
        return []
    results: list[SearchResult] = []
    for item in data[:limit]:
        try:
            results.append(SearchResult.model_validate(item))
        except Exception:
            continue
    return results


# ────────────────────────────────────────────────────────────────────────────
# 4. TEAM BUILDER
# ────────────────────────────────────────────────────────────────────────────

async def build_team(brief: str, candidates: list[dict], team_size: int) -> TeamBuildResult:
    prompt = search_v1.build_team_prompt(brief, candidates, team_size)
    client = get_client()
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL_SHOWCASE,
            contents=prompt,
            config=make_generation_config(temperature=0.3),
        )
    except Exception as e:
        raise UpstreamAIError("Team builder failed") from e

    text = (response.text or "").strip()
    try:
        data = safe_json_loads(text)
    except json.JSONDecodeError as e:
        raise UpstreamAIError("AI returned invalid JSON for team builder") from e

    try:
        return TeamBuildResult.model_validate(data)
    except Exception as e:
        raise UpstreamAIError("AI team-builder output did not match schema") from e


# Re-exported for prompt-iteration scripts.
def _peek_extraction_prompt(resume_text: str) -> str:
    return extraction_v1.build_prompt(resume_text)


def _peek_search_prompt(
    query: str,
    candidates: list[dict],
    limit: int,
    temporal_context: dict[str, str],
) -> str:
    return search_v1.build_prompt(query, candidates, limit, temporal_context)


def candidate_dict_from_employee(emp: dict[str, Any]) -> dict[str, Any]:
    """Compact representation passed to the search/team prompts.
    Accepts a serialised employee dict (from EmployeeService.to_search_candidate).
    """
    return {
        "id": emp["id"],
        "name": emp["full_name"],
        "headline": emp.get("headline"),
        "location": emp.get("location"),
        "years_experience": emp.get("years_experience"),
        "allocation_status": emp.get("allocation_status"),
        "last_project_end_date": emp.get("last_project_end_date"),
        "skills": [
            {
                "name": s["name"],
                "proficiency": s["proficiency"],
                "years_experience": s.get("years_experience"),
            }
            for s in emp.get("skills", [])
        ],
        "projects": [
            {
                "title": p["title"],
                "role": p.get("role"),
                "domain": p.get("domain"),
                "tech_stack": p.get("tech_stack") or [],
                "description": (p.get("description") or "")[:280],
            }
            for p in emp.get("projects", [])
        ],
    }
