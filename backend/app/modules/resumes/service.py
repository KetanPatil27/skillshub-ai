import io
import logging
import uuid
from datetime import date, datetime
from typing import Any

import httpx
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.modules.ai import service as ai_service
from app.modules.ai.schemas import ExtractedProfile, InferredSkill
from app.modules.employees.models import AllocationStatus, Employee, ProfileStatus
from app.modules.employees.schemas import (
    EmployeeCreate,
    ProjectCreate,
    SkillCreate,
)
from app.modules.employees.service import EmployeeService
from app.modules.review.models import ReviewQueueItem, ReviewStatus
from app.modules.users.models import User, UserRole

logger = logging.getLogger("skillshub.resumes")

MAX_BYTES = 5 * 1024 * 1024


def _parse_month(s: str | None) -> date | None:
    if not s:
        return None
    for fmt in ("%Y-%m", "%Y/%m", "%b %Y", "%B %Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date().replace(day=1)
        except ValueError:
            continue
    return None


def _pdf_to_text(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as e:
        raise BadRequestError("Could not read the PDF — is it corrupt?") from e
    pages = []
    for p in reader.pages:
        try:
            pages.append(p.extract_text() or "")
        except Exception:
            continue
    text = "\n".join(pages).strip()
    if len(text) < 80:
        raise BadRequestError(
            "PDF text was too short to parse — is this a scanned image? Use a text-based PDF."
        )
    return text


class ResumeService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── public entry ────────────────────────────────

    async def upload_and_extract(
        self,
        *,
        user: User,
        filename: str,
        content: bytes,
    ) -> tuple[Employee, ExtractedProfile, list[InferredSkill], str | None]:
        if not filename.lower().endswith(".pdf"):
            raise BadRequestError("Only PDF files are accepted")
        if len(content) > MAX_BYTES:
            raise BadRequestError("Resume exceeds 5MB limit")
        if len(content) < 200:
            raise BadRequestError("File is too small to be a real resume")

        # 1. Extract text
        raw_text = _pdf_to_text(content)

        # 2. Upload original to Supabase Storage (best-effort).
        resume_url = await self._upload_to_supabase(filename, content)

        # 3. AI extraction
        extracted = await ai_service.extract_resume(raw_text)

        # 4. AI inference (degrades to [] on failure inside the service).
        inferred = await ai_service.infer_related_skills(
            [s.model_dump() for s in extracted.skills]
        )

        # 5. Persist
        employee = await self._persist(
            user=user,
            extracted=extracted,
            inferred=inferred,
            resume_url=resume_url,
        )

        # 6. Review queue
        self.db.add(
            ReviewQueueItem(
                employee_id=employee.id,
                submitted_by_user_id=user.id,
                status=ReviewStatus.PENDING,
            )
        )
        await self.db.commit()

        # Refresh with relations loaded
        emp = await EmployeeService(self.db).get(employee.id)
        return emp, extracted, inferred, resume_url

    # ── internals ───────────────────────────────────

    async def _persist(
        self,
        *,
        user: User,
        extracted: ExtractedProfile,
        inferred: list[InferredSkill],
        resume_url: str | None,
    ) -> Employee:
        emp_svc = EmployeeService(self.db)

        # Decide ownership:
        # - EMPLOYEE users always overwrite their own profile if it exists.
        # - HR users uploading on behalf of someone create a new (unlinked) profile.
        existing = (
            await emp_svc.get_by_user_id(user.id)
            if user.role == UserRole.USER
            else None
        )

        # Build the SkillCreate list (explicit + inferred)
        skill_payloads: list[SkillCreate] = []
        for s in extracted.skills:
            skill_payloads.append(
                SkillCreate(
                    name=s.name.strip(),
                    category=s.category,
                    proficiency=s.proficiency,
                    years_experience=s.years_experience,
                    evidence=s.evidence,
                    is_inferred=False,
                )
            )
        explicit_names = {sp.name.lower() for sp in skill_payloads}
        for ins in inferred:
            if ins.name.lower() in explicit_names:
                continue
            skill_payloads.append(
                SkillCreate(
                    name=ins.name.strip(),
                    category=ins.category,
                    proficiency=ins.proficiency,
                    years_experience=None,
                    is_inferred=True,
                    inference_confidence=ins.confidence,
                    inference_reason=ins.reason,
                )
            )

        project_payloads: list[ProjectCreate] = []
        latest_end: date | None = None
        for p in extracted.projects:
            start = _parse_month(p.start_date)
            end = _parse_month(p.end_date)
            if end and (latest_end is None or end > latest_end):
                latest_end = end
            project_payloads.append(
                ProjectCreate(
                    title=p.title,
                    description=p.description,
                    role=p.role,
                    domain=p.domain,
                    start_date=start,
                    end_date=end,
                    tech_stack=p.tech_stack or [],
                )
            )

        if existing:
            existing.full_name = extracted.full_name
            existing.headline = extracted.headline
            existing.location = extracted.location
            existing.years_experience = extracted.years_experience
            existing.last_project_end_date = latest_end
            existing.raw_extracted_json = extracted.model_dump(mode="json")
            existing.status = ProfileStatus.PENDING_REVIEW
            if resume_url:
                existing.resume_url = resume_url
            await self.db.flush()
            await emp_svc.replace_skills(existing.id, skill_payloads)
            await emp_svc.replace_projects(existing.id, project_payloads)
            return await emp_svc.get(existing.id)

        emp = await emp_svc.create(
            EmployeeCreate(
                user_id=user.id if user.role == UserRole.USER else None,
                full_name=extracted.full_name,
                headline=extracted.headline,
                location=extracted.location,
                years_experience=extracted.years_experience,
                allocation_status=AllocationStatus.UNALLOCATED,
                last_project_end_date=latest_end,
                skills=skill_payloads,
                projects=project_payloads,
            )
        )
        emp.raw_extracted_json = extracted.model_dump(mode="json")
        emp.resume_url = resume_url
        await self.db.flush()
        return await emp_svc.get(emp.id)

    async def _upload_to_supabase(self, filename: str, content: bytes) -> str | None:
        """Best-effort upload to Supabase Storage. Returns the public URL.
        Falls back to None if Supabase is not configured — the rest of the pipeline
        still works (we just won't display a "View resume PDF" link)."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            logger.info("Supabase not configured; skipping storage upload")
            return None

        safe_name = f"{uuid.uuid4()}-{filename.replace(' ', '_')}"
        bucket = settings.SUPABASE_STORAGE_BUCKET
        url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{safe_name}"
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{safe_name}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/pdf",
            "x-upsert": "true",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.post(url, content=content, headers=headers)
            if r.status_code >= 400:
                logger.warning("supabase upload failed: %s %s", r.status_code, r.text[:200])
                return None
            return public_url
        except Exception:
            logger.exception("supabase upload exception")
            return None
