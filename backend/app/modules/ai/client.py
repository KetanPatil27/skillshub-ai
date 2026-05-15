"""Singleton Gemini client wrapper.

Uses the unified `google-genai` SDK (pip install google-genai). This replaces the
older `google-generativeai` package.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from google import genai
from google.genai import types as genai_types

from app.core.config import settings

logger = logging.getLogger("skillshub.ai")


@lru_cache
def get_client() -> genai.Client:
    return genai.Client(api_key=settings.GOOGLE_API_KEY)


def make_generation_config(
    *,
    response_mime_type: str = "application/json",
    temperature: float = 0.2,
    max_output_tokens: int | None = None,
) -> genai_types.GenerateContentConfig:
    return genai_types.GenerateContentConfig(
        response_mime_type=response_mime_type,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )
