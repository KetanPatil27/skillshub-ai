import json
import re
from typing import Any


_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


def strip_code_fences(text: str) -> str:
    return _FENCE_RE.sub("", text.strip()).strip()


def safe_json_loads(text: str) -> Any:
    """Parse JSON tolerantly: strips ```json fences if present."""
    cleaned = strip_code_fences(text)
    # Some models emit a leading 'json' label or stray prefix
    if cleaned.lower().startswith("json"):
        cleaned = cleaned[4:].lstrip(": \n")
    return json.loads(cleaned)


def initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", name.strip()) if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()
