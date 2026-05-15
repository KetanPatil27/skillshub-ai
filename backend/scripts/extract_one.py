"""Run resume extraction on a single PDF and print the JSON output.

Used during prompt iteration — no DB, no UI in the way.

Usage:
    python -m scripts.extract_one path/to/resume.pdf
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from app.modules.ai import service as ai_service
from app.modules.resumes.service import _pdf_to_text  # reuse


async def _run(pdf_path: Path) -> None:
    text = _pdf_to_text(pdf_path.read_bytes())
    print(f"== Extracted {len(text)} chars from PDF ==\n", file=sys.stderr)
    profile = await ai_service.extract_resume(text)
    inferred = await ai_service.infer_related_skills([s.model_dump() for s in profile.skills])
    out = {
        "profile": profile.model_dump(),
        "inferred_skills": [s.model_dump() for s in inferred],
    }
    print(json.dumps(out, indent=2, default=str))


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.extract_one <resume.pdf>", file=sys.stderr)
        sys.exit(2)
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)
    asyncio.run(_run(path))


if __name__ == "__main__":
    main()
