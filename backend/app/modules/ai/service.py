"""High-level AI operations.

Pure async functions over plain dicts/strings. The HTTP layer adapts these into
DB rows and SSE streams. Keeping this layer pure makes the CLI scripts trivial.

Includes automatic fallback to Hugging Face Inference API when the Gemini
free-tier quota is exhausted (RESOURCE_EXHAUSTED / 429).
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
from app.modules.ai.hf_client import hf_available, hf_generate, hf_generate_resume, is_quota_error, safe_parse_json
from app.modules.ai.prompts import extraction_v1, inference_v1, jd_distill_v1, search_v1
from app.modules.ai.schemas import (
    ExtractedProfile,
    InferredSkill,
    SearchResult,
    TeamBuildResult,
)

logger = logging.getLogger("skillshub.ai")


def _humanize_gemini_error(exc: BaseException) -> str:
    """Map raw Gemini SDK errors to a message the UI can show to a user.

    The SDK raises `google.genai.errors.ClientError` (HTTP 4xx) and
    `ServerError` (5xx); we check status code via attribute lookups so this
    file doesn't have to import the SDK error types.
    """
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    text = str(exc)
    if code == 429 or "RESOURCE_EXHAUSTED" in text:
        return (
            "Daily AI quota reached for the configured Gemini model. "
            "Try again after the quota resets, or switch GEMINI_MODEL_SHOWCASE "
            "in your .env to a different model."
        )
    if code == 503 or "UNAVAILABLE" in text:
        return "The AI service is temporarily overloaded. Please retry in a few seconds."
    if code in (401, 403):
        return "AI service rejected the request — check that GOOGLE_API_KEY is valid."
    return "The AI service failed to respond. Please retry."


# ────────────────────────────────────────────────────────────────────────────
# HELPER: HF-first call with automatic Gemini fallback
# ────────────────────────────────────────────────────────────────────────────

async def _call_ai(
    *,
    prompt: str,
    model: str,
    temperature: float = 0.2,
    response_mime_type: str = "application/json",
    label: str = "ai_call",
    allow_fallback: bool = True,
) -> str:
    """Try Hugging Face first.  If HF fails (OOM, rate-limit, any error),
    fall back to Gemini.

    Returns the raw response text.
    """
    # ── 1. Try HF first ──
    if hf_available():
        try:
            text = await asyncio.to_thread(
                hf_generate,
                prompt,
                temperature=temperature,
            )
            return text
        except Exception as hf_exc:
            logger.warning(
                "%s: HF failed (%s) — %s",
                label,
                hf_exc,
                "falling back to Gemini" if allow_fallback else "failing",
            )
            if not allow_fallback:
                raise UpstreamAIError(f"HF failed: {hf_exc}") from hf_exc

    # ── 2. Gemini fallback ──
    if not allow_fallback:
        raise UpstreamAIError("Gemini fallback disabled")

    client = get_client()
    try:
        logger.info("%s: using Gemini (%s)", label, model)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=prompt,
            config=make_generation_config(
                temperature=temperature,
                response_mime_type=response_mime_type,
            ),
        )
        return (response.text or "").strip()
    except Exception as gemini_exc:
        logger.exception("%s: Gemini also failed", label)
        raise UpstreamAIError(_humanize_gemini_error(gemini_exc)) from gemini_exc


# ────────────────────────────────────────────────────────────────────────────
# 1. RESUME EXTRACTION
# ────────────────────────────────────────────────────────────────────────────

async def extract_resume(resume_text: str, allow_fallback: bool = True) -> ExtractedProfile:
    """Extract structured profile from resume text.

    Pipeline:
    1. HF with Llama-3.1-8B-Instruct (strict JSON, retry on parse failure)
    2. Gemini (final fallback if HF fails)
    """
    prompt = extraction_v1.build_prompt(resume_text)
    hf_error: str | None = None

    # ── 1. Try HF dedicated resume model (Mistral) ──
    if hf_available():
        try:
            logger.info("extract_resume: using HF (%s)", settings.HF_RESUME_MODEL)
            text = await asyncio.to_thread(hf_generate_resume, prompt, temperature=0.1)
            data = safe_parse_json(text)
            logger.info("extract_resume: HF resume model succeeded")
            return ExtractedProfile.model_validate(data)
        except Exception as hf_exc:
            hf_error = f"{type(hf_exc).__name__}: {hf_exc}"
            logger.warning(
                "extract_resume: HF resume pipeline failed (%s) — %s",
                hf_exc,
                "trying Gemini" if allow_fallback else "failing",
            )
            if not allow_fallback:
                raise UpstreamAIError(f"AI extraction failed (HF tried first: {hf_error[:160]})") from hf_exc

    # ── 2. Gemini fallback ──
    if not allow_fallback:
        raise UpstreamAIError("AI extraction failed — HF not available and Gemini fallback disabled")

    client = get_client()
    try:
        logger.info("extract_resume: using Gemini (%s) as fallback", settings.GEMINI_MODEL_SHOWCASE)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL_SHOWCASE,
            contents=prompt,
            config=make_generation_config(temperature=0.1),
        )
        text = (response.text or "").strip()
        data = safe_json_loads(text)
        return ExtractedProfile.model_validate(data)
    except Exception as e:
        logger.exception("extract_resume: Gemini call failed")
        gemini_reason = _humanize_gemini_error(e)
        detail = f"AI extraction failed — {gemini_reason}"
        if hf_error:
            detail += f" (HF tried first: {hf_error[:160]})"
        raise UpstreamAIError(detail) from e


# ────────────────────────────────────────────────────────────────────────────
# 2. INFERRED SKILLS
# ────────────────────────────────────────────────────────────────────────────

async def infer_related_skills(explicit_skills: list[dict], allow_fallback: bool = True) -> list[InferredSkill]:
    """Returns at most 5 high-confidence inferred skills."""
    if not explicit_skills:
        return []
    prompt = inference_v1.build_prompt(explicit_skills)
    try:
        text = await _call_ai(
            prompt=prompt,
            model=settings.GEMINI_MODEL_LIGHT,
            temperature=0.3,
            label="infer_related_skills",
            allow_fallback=allow_fallback,
        )
    except Exception:
        logger.exception("infer_related_skills ai call failed")
        # Inference is non-critical — degrade gracefully.
        return []

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

    Uses the light model with low temperature — this is a deterministic
    rewriting task, not creative ranking. Plain text out, not JSON.
    """
    prompt = jd_distill_v1.build_prompt(jd_text)
    try:
        text = await _call_ai(
            prompt=prompt,
            model=settings.GEMINI_MODEL_LIGHT,
            temperature=0.1,
            response_mime_type="text/plain",
            label="distill_jd_to_query",
        )
    except Exception as e:
        logger.exception("distill_jd_to_query ai call failed")
        raise UpstreamAIError(_humanize_gemini_error(e)) from e

    text = text.strip().strip('"').strip("'").strip()
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
    """Yields SearchResult objects one at a time as the AI returns its JSON array.

    Tries HF first (non-streaming). If HF fails, falls back to Gemini streaming.
    """
    prompt = search_v1.build_prompt(query, candidates, limit, temporal_context)

    queue: asyncio.Queue[SearchResult | None | Exception] = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def _producer() -> None:
        hf_succeeded = False

        # ── 1. Try HF first (non-streaming) ──
        if hf_available():
            try:
                text = hf_generate(prompt, temperature=0.2)
                data = safe_json_loads(text)
                if isinstance(data, list):
                    for item in data[:limit]:
                        try:
                            result = SearchResult.model_validate(item)
                            asyncio.run_coroutine_threadsafe(
                                queue.put(result), loop
                            ).result()
                        except Exception:
                            continue
                    hf_succeeded = True
            except Exception as hf_exc:
                logger.warning(
                    "stream_search_results: HF failed (%s) — falling back to Gemini",
                    hf_exc,
                )

        # ── 2. Gemini fallback (streaming) ──
        if not hf_succeeded:
            try:
                client = get_client()
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
                logger.exception("stream_search_results: Gemini also failed")
                asyncio.run_coroutine_threadsafe(queue.put(exc), loop).result()

    def _producer_wrapper() -> None:
        try:
            _producer()
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop).result()

    task = asyncio.create_task(asyncio.to_thread(_producer_wrapper))

    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise UpstreamAIError(_humanize_gemini_error(item)) from item
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
    try:
        text = await _call_ai(
            prompt=prompt,
            model=settings.GEMINI_MODEL_SHOWCASE,
            temperature=0.2,
            label="rank_candidates",
        )
    except Exception as e:
        raise UpstreamAIError(_humanize_gemini_error(e)) from e

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
    try:
        text = await _call_ai(
            prompt=prompt,
            model=settings.GEMINI_MODEL_SHOWCASE,
            temperature=0.3,
            label="build_team",
        )
    except Exception as e:
        raise UpstreamAIError("Team builder failed") from e

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
