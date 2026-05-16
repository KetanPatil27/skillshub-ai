"""Reproduce the resume extraction failure with the HF fallback path."""
from __future__ import annotations

import asyncio
import logging
import traceback
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

import app.models  # noqa: register mappers
from app.modules.ai import service as ai_service
from app.modules.ai.hf_client import hf_available, hf_generate
from app.modules.ai.prompts import extraction_v1, inference_v1
from app.modules.resumes.service import _pdf_to_text


PDF = Path(__file__).resolve().parents[1] / "test_resume.pdf"


async def run() -> None:
    print(f"PDF: {PDF.exists()}  size={PDF.stat().st_size}")
    print(f"HF available: {hf_available()}")

    content = PDF.read_bytes()
    text = _pdf_to_text(content)
    print(f"\n--- Extracted PDF text ({len(text)} chars) ---")
    print(text)
    print("---")

    # 1) Step 1: extract_resume (calls HF first)
    print("\n\n=== Step 1: extract_resume ===")
    try:
        profile = await ai_service.extract_resume(text)
        print(f"got profile with {len(profile.skills)} skills, {len(profile.projects)} projects")
        for s in profile.skills:
            print(f"  skill: name={s.name!r} cat={s.category} prof={s.proficiency} yrs={s.years_experience}")
        for p in profile.projects:
            print(f"  proj: title={p.title!r} role={p.role!r} dates={p.start_date}->{p.end_date}")
    except Exception:
        print("extract_resume FAILED:")
        traceback.print_exc()
        return

    # 2) Step 2: infer_related_skills
    print("\n\n=== Step 2: infer_related_skills ===")
    skills_input = [s.model_dump() for s in profile.skills]
    print(f"feeding {len(skills_input)} explicit skills")

    # Raw HF call for visibility:
    inf_prompt = inference_v1.build_prompt(skills_input)
    try:
        print("\n-- Raw HF inference output --")
        raw_inf = await asyncio.to_thread(hf_generate, inf_prompt, temperature=0.3, max_tokens=3072)
        print(raw_inf[:2000])
        if len(raw_inf) > 2000:
            print(f"... [+{len(raw_inf) - 2000} more chars]")
    except Exception:
        print("Raw HF inference call raised:")
        traceback.print_exc()

    try:
        inferred = await ai_service.infer_related_skills(skills_input)
        print(f"\n-- Pipeline returned {len(inferred)} inferred skills --")
        for s in inferred:
            print(f"  inferred: {s.name} ({s.category}/{s.proficiency}) "
                  f"conf={s.confidence:.2f} reason={s.reason[:80]!r}")
    except Exception:
        print("infer_related_skills FAILED:")
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run())
