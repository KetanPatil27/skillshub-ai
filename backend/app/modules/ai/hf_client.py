"""Hugging Face Inference API client.

Primary AI provider for SkillsHub. Uses model-specific routing:
- Resume extraction: Qwen2.5-72B-Instruct (primary) → Mistral-Large (fallback)
- Search / inference / other: Llama-3.1-8B-Instruct (default)

Includes robust JSON extraction, retry logic, and prompt truncation.
"""

from __future__ import annotations

import json
import logging
import re
import time
from functools import lru_cache

from huggingface_hub import InferenceClient

from app.core.config import settings

logger = logging.getLogger("skillshub.ai.hf")

# Llama-3.1-8B has ~8k context; Qwen2.5-72B and Mistral-Large have ~128k.
# We use a conservative default and a larger limit for big models.
_MAX_PROMPT_CHARS_DEFAULT = 22_000
_MAX_PROMPT_CHARS_LARGE = 100_000


# ────────────────────────────────────────────────────────────────────────────
# Client
# ────────────────────────────────────────────────────────────────────────────

@lru_cache
def get_hf_client() -> InferenceClient | None:
    """Return an HF InferenceClient, or *None* if no token is configured."""
    token = settings.HUGGINGFACEHUB_API_TOKEN
    if not token:
        return None
    return InferenceClient(token=token)


def hf_available() -> bool:
    """Quick check: is the HF provider configured?"""
    return bool(settings.HUGGINGFACEHUB_API_TOKEN)


def _is_transient_hf_error(exc: BaseException) -> bool:
    """Detect HF Inference API errors worth retrying after a short wait.
    Covers 429 (rate-limit), 503 (model loading / overloaded), and timeouts."""
    text = str(exc).lower()
    code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if code in (429, 502, 503, 504):
        return True
    for marker in (
        "rate limit",
        "rate-limit",
        "too many requests",
        "service unavailable",
        "model is currently loading",
        "currently loading",
        "overloaded",
        "timeout",
        "timed out",
        "503",
        "429",
    ):
        if marker in text:
            return True
    return False


# ────────────────────────────────────────────────────────────────────────────
# JSON extraction helpers
# ────────────────────────────────────────────────────────────────────────────

def extract_json_block(text: str) -> str:
    """Extract clean JSON from LLM output that may contain markdown or prose.

    Handles:
    - ```json ... ``` fences
    - ``` ... ``` fences
    - Leading/trailing prose around JSON
    - Nested objects/arrays
    """
    text = text.strip()

    # 1. Strip markdown code fences
    fence_pattern = re.compile(r"```(?:json)?\s*\n?(.*?)```", re.DOTALL)
    match = fence_pattern.search(text)
    if match:
        text = match.group(1).strip()

    # 2. If it starts with { or [, assume it's JSON already
    if text and text[0] in "{[":
        return text

    # 3. Try to find the first { or [ and extract from there
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        idx = text.find(start_char)
        if idx != -1:
            # Walk backwards from the end to find the matching close
            ridx = text.rfind(end_char)
            if ridx > idx:
                return text[idx : ridx + 1]

    # 4. Return as-is if nothing worked
    return text


def safe_parse_json(text: str) -> dict | list:
    """Parse JSON from potentially messy LLM output.

    1. Try raw json.loads
    2. Try after extracting JSON block
    3. Raise on failure
    """
    text = text.strip()

    # Fast path: valid JSON as-is
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Extract JSON block and retry
    cleaned = extract_json_block(text)
    return json.loads(cleaned)  # Let this raise if it fails


# ────────────────────────────────────────────────────────────────────────────
# System prompts
# ────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT_DEFAULT = (
    "You are a precise JSON API. You MUST return ONLY valid JSON — "
    "no markdown fences, no commentary, no extra text. "
    "Follow the user instructions exactly."
)

_SYSTEM_PROMPT_STRICT_JSON = (
    "You are a precise JSON API for resume parsing.\n\n"
    "CRITICAL RULES:\n"
    "- Return ONLY valid JSON.\n"
    "- Do NOT include markdown code fences (no ```).\n"
    "- Do NOT include explanations, comments, or prose.\n"
    "- Do NOT wrap output in triple backticks.\n"
    "- The response must be valid parsable JSON and nothing else.\n"
    "- Start your response with { and end with }.\n"
    "- Every string value must be properly escaped.\n"
    "- Follow the schema provided in the user prompt exactly."
)


# ────────────────────────────────────────────────────────────────────────────
# Prompt truncation
# ────────────────────────────────────────────────────────────────────────────

def _truncate_prompt(prompt: str, max_chars: int = _MAX_PROMPT_CHARS_DEFAULT) -> str:
    """Trim the prompt to fit within the model's context window."""
    if len(prompt) <= max_chars:
        return prompt

    # Try to find and compress the candidates JSON block
    for marker in ("CANDIDATE PROFILES (JSON):", "AVAILABLE EMPLOYEES (JSON):"):
        idx = prompt.find(marker)
        if idx == -1:
            continue

        json_start = idx + len(marker)
        preamble = prompt[:json_start]
        rest = prompt[json_start:]

        end_markers = ["\n\nNow output", "\n\nOutput the JSON"]
        suffix = ""
        json_body = rest
        for em in end_markers:
            em_idx = rest.find(em)
            if em_idx != -1:
                json_body = rest[:em_idx]
                suffix = rest[em_idx:]
                break

        try:
            candidates = json.loads(json_body.strip())
            if isinstance(candidates, list) and len(candidates) > 3:
                for n in (8, 5, 3):
                    trimmed = candidates[:n]
                    compact = json.dumps(trimmed, separators=(",", ":"), default=str)
                    new_prompt = preamble + "\n" + compact + suffix
                    if len(new_prompt) <= max_chars:
                        logger.info("Trimmed candidates from %d to %d", len(candidates), n)
                        return new_prompt
        except (json.JSONDecodeError, ValueError):
            pass

    logger.warning("Hard-truncating prompt from %d to %d chars", len(prompt), max_chars)
    return prompt[:max_chars]


# ────────────────────────────────────────────────────────────────────────────
# Core generation functions
# ────────────────────────────────────────────────────────────────────────────

def hf_generate(
    prompt: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    model_id: str | None = None,
) -> str:
    """General-purpose HF chat completion. Used by search, inference, etc.

    Uses the default model (HF_MODEL_ID = Llama-3.1-8B) unless overridden.
    """
    client = get_hf_client()
    if client is None:
        raise RuntimeError("Hugging Face is not configured (no API token)")

    model = model_id or settings.HF_MODEL_ID
    is_large_model = any(tag in model.lower() for tag in ("qwen", "mistral-large", "72b", "70b"))
    max_chars = _MAX_PROMPT_CHARS_LARGE if is_large_model else _MAX_PROMPT_CHARS_DEFAULT

    prompt = _truncate_prompt(prompt, max_chars)

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT_DEFAULT},
        {"role": "user", "content": prompt},
    ]

    logger.info("HF request → %s (prompt ~%d chars, max_tokens=%d)", model, len(prompt), max_tokens)
    t0 = time.monotonic()

    last_exc: BaseException | None = None
    response = None
    for attempt in range(1, 4):  # up to 3 tries with backoff
        try:
            response = client.chat_completion(
                model=model,
                messages=messages,
                temperature=max(temperature, 0.01),
                max_tokens=max_tokens,
            )
            break
        except Exception as exc:
            last_exc = exc
            if attempt < 3 and _is_transient_hf_error(exc):
                wait = 1.5 * attempt
                logger.warning(
                    "HF transient error on %s attempt %d (%s) — retrying in %.1fs",
                    model, attempt, exc, wait,
                )
                time.sleep(wait)
                continue
            raise

    assert response is not None  # narrow type for mypy; loop either returns or raises

    text = response.choices[0].message.content or ""
    elapsed = time.monotonic() - t0
    logger.info("HF response ← %s (%d chars, %.1fs)", model, len(text), elapsed)

    return extract_json_block(text)


def hf_generate_resume(prompt: str, *, temperature: float = 0.1) -> str:
    """Dedicated resume extraction call with strict JSON enforcement.

    Model priority:
    1. Qwen/Qwen2.5-72B-Instruct  (strong JSON adherence, large context)
    2. mistralai/Mistral-Large-Instruct  (fallback if Qwen fails)

    Includes retry-on-parse-failure logic.
    """
    client = get_hf_client()
    if client is None:
        raise RuntimeError("Hugging Face is not configured (no API token)")

    models = [settings.HF_RESUME_MODEL, settings.HF_RESUME_FALLBACK_MODEL]

    for model in models:
        for attempt in range(1, 3):  # 2 attempts per model
            try:
                logger.info(
                    "Resume extraction → %s (attempt %d/2, prompt ~%d chars)",
                    model, attempt, len(prompt),
                )
                t0 = time.monotonic()

                messages = [
                    {"role": "system", "content": _SYSTEM_PROMPT_STRICT_JSON},
                    {"role": "user", "content": prompt},
                ]

                response = client.chat_completion(
                    model=model,
                    messages=messages,
                    temperature=max(temperature, 0.01),
                    max_tokens=4096,
                )

                raw = response.choices[0].message.content or ""
                elapsed = time.monotonic() - t0
                logger.info(
                    "Resume extraction ← %s (%d chars, %.1fs, attempt %d)",
                    model, len(raw), elapsed, attempt,
                )

                # Validate JSON before returning
                cleaned = extract_json_block(raw)
                parsed = json.loads(cleaned)  # Throws if invalid

                # Basic sanity: must be a dict with full_name
                if not isinstance(parsed, dict):
                    raise ValueError("Expected JSON object, got array/scalar")

                logger.info(
                    "Resume extraction ✓ valid JSON from %s (attempt %d, keys=%s)",
                    model, attempt, list(parsed.keys())[:5],
                )
                return cleaned

            except (json.JSONDecodeError, ValueError) as parse_err:
                logger.warning(
                    "Resume extraction: JSON parse failed on %s attempt %d: %s",
                    model, attempt, parse_err,
                )
                if attempt < 2:
                    logger.info("Retrying same model...")
                    continue
                else:
                    logger.warning("Exhausted retries on %s, trying next model", model)
                    break

            except Exception as api_err:
                logger.warning(
                    "Resume extraction: API error on %s attempt %d: %s",
                    model, attempt, api_err,
                )
                # Retry transient errors (429/503/timeout) on the same model
                # before moving on — HF Inference free tier is bursty.
                if attempt < 2 and _is_transient_hf_error(api_err):
                    wait = 1.5 * attempt
                    logger.info(
                        "Transient HF error — retrying %s in %.1fs",
                        model, wait,
                    )
                    time.sleep(wait)
                    continue
                break  # Non-transient or out of attempts — try next model

    raise RuntimeError(
        f"Resume extraction failed on all HF models: "
        f"{[settings.HF_RESUME_MODEL, settings.HF_RESUME_FALLBACK_MODEL]}"
    )


# ────────────────────────────────────────────────────────────────────────────
# Utility
# ────────────────────────────────────────────────────────────────────────────

def is_quota_error(exc: BaseException) -> bool:
    """Return True if *exc* looks like a Gemini RESOURCE_EXHAUSTED / 429 error."""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    text = str(exc)
    return code == 429 or "RESOURCE_EXHAUSTED" in text
