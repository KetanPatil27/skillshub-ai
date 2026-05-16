from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.employees.models import (
    AllocationStatus,
    Employee,
    Project,
    ProfileStatus,
    Skill,
)
from app.modules.employees.schemas import (
    EmployeeCreate,
    EmployeeFilter,
    EmployeeUpdate,
    ProjectCreate,
    SkillCreate,
)
from app.modules.review.models import ReviewQueueItem, ReviewStatus
from app.modules.users.models import User, UserRole


class EmployeeService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Reads ──────────────────────────────────────────

    async def get(self, employee_id: UUID) -> Employee:
        stmt = (
            select(Employee)
            .options(selectinload(Employee.skills), selectinload(Employee.projects))
            .where(Employee.id == employee_id)
        )
        result = await self.db.execute(stmt)
        emp = result.scalar_one_or_none()
        if emp is None:
            raise NotFoundError("Employee not found")
        return emp

    async def get_by_user_id(self, user_id: UUID) -> Employee | None:
        stmt = (
            select(Employee)
            .options(selectinload(Employee.skills), selectinload(Employee.projects))
            .where(Employee.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_page(self, f: EmployeeFilter) -> tuple[list[Employee], int]:
        base = select(Employee).options(
            selectinload(Employee.skills), selectinload(Employee.projects)
        )
        count_stmt = select(func.count()).select_from(Employee)

        conditions = []
        if f.location:
            conditions.append(Employee.location.ilike(f"%{f.location}%"))
        if f.allocation_status:
            conditions.append(Employee.allocation_status == f.allocation_status)
        if f.min_years is not None:
            conditions.append(Employee.years_experience >= f.min_years)
        if f.status:
            conditions.append(Employee.status == f.status)
        if f.q:
            like = f"%{f.q}%"
            conditions.append(
                or_(
                    Employee.full_name.ilike(like),
                    Employee.headline.ilike(like),
                    Employee.bio.ilike(like),
                )
            )

        for c in conditions:
            base = base.where(c)
            count_stmt = count_stmt.where(c)

        total = (await self.db.execute(count_stmt)).scalar_one()
        base = (
            base.order_by(Employee.updated_at.desc())
            .offset((f.page - 1) * f.page_size)
            .limit(f.page_size)
        )
        rows = (await self.db.execute(base)).scalars().all()
        return list(rows), int(total)

    async def list_approved_candidates(self) -> list[Employee]:
        stmt = (
            select(Employee)
            .options(selectinload(Employee.skills), selectinload(Employee.projects))
            .where(Employee.status == ProfileStatus.APPROVED)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    # ── Writes ─────────────────────────────────────────

    async def create(self, payload: EmployeeCreate) -> Employee:
        emp = Employee(
            user_id=payload.user_id,
            full_name=payload.full_name,
            headline=payload.headline,
            location=payload.location,
            years_experience=payload.years_experience,
            allocation_status=payload.allocation_status,
            last_project_end_date=payload.last_project_end_date,
            bio=payload.bio,
        )
        self.db.add(emp)
        await self.db.flush()

        await self._replace_skills(emp.id, payload.skills)
        await self._replace_projects(emp.id, payload.projects)

        await self.db.flush()
        return await self.get(emp.id)

    async def update(self, employee_id: UUID, payload: EmployeeUpdate) -> Employee:
        emp = await self.get(employee_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(emp, field, value)
        await self.db.flush()
        return await self.get(employee_id)

    async def replace_skills(self, employee_id: UUID, skills: list[SkillCreate]) -> None:
        await self._replace_skills(employee_id, skills)
        await self.db.flush()

    async def replace_projects(
        self, employee_id: UUID, projects: list[ProjectCreate]
    ) -> None:
        await self._replace_projects(employee_id, projects)
        await self.db.flush()

    async def set_status(self, employee_id: UUID, status: ProfileStatus) -> Employee:
        emp = await self.get(employee_id)
        emp.status = status
        await self.db.flush()
        return await self.get(employee_id)

    async def attach_resume(
        self,
        employee_id: UUID,
        *,
        resume_url: str | None,
        raw_extracted_json: dict | None,
    ) -> None:
        emp = await self.get(employee_id)
        if resume_url is not None:
            emp.resume_url = resume_url
        if raw_extracted_json is not None:
            emp.raw_extracted_json = raw_extracted_json
        await self.db.flush()

    # ── Internals ──────────────────────────────────────

    async def _replace_skills(self, employee_id: UUID, skills: list[SkillCreate]) -> None:
        existing = await self.db.execute(select(Skill).where(Skill.employee_id == employee_id))
        for s in existing.scalars().all():
            await self.db.delete(s)
        await self.db.flush()

        # Dedupe within input by lowercased name (defensive).
        seen: dict[str, SkillCreate] = {}
        for s in skills:
            seen[s.name.lower()] = s

        for s in seen.values():
            self.db.add(
                Skill(
                    employee_id=employee_id,
                    name=s.name,
                    category=s.category,
                    proficiency=s.proficiency,
                    years_experience=s.years_experience,
                    is_inferred=s.is_inferred,
                    inference_confidence=s.inference_confidence,
                    inference_reason=s.inference_reason,
                    evidence=s.evidence,
                )
            )

    async def _replace_projects(
        self, employee_id: UUID, projects: list[ProjectCreate]
    ) -> None:
        existing = await self.db.execute(
            select(Project).where(Project.employee_id == employee_id)
        )
        for p in existing.scalars().all():
            await self.db.delete(p)
        await self.db.flush()

        for p in projects:
            self.db.add(
                Project(
                    employee_id=employee_id,
                    title=p.title,
                    description=p.description,
                    role=p.role,
                    domain=p.domain,
                    start_date=p.start_date,
                    end_date=p.end_date,
                    tech_stack=p.tech_stack or [],
                )
            )

    # ── Authorization helpers ──────────────────────────

    @staticmethod
    def ensure_can_view(user: User, emp: Employee) -> None:
        if user.role == UserRole.ADMIN:
            return
        if emp.user_id == user.id:
            return
        raise ForbiddenError("You do not have access to this employee profile")

    @staticmethod
    def ensure_can_edit(user: User, emp: Employee) -> None:
        if user.role == UserRole.ADMIN:
            return
        if emp.user_id == user.id:
            return
        raise ForbiddenError("You can only edit your own profile")

    async def flag_for_rereview_if_owner_edit(
        self, user: User, emp_status_before: ProfileStatus, emp: Employee
    ) -> bool:
        """If a non-admin owner edited their previously-APPROVED profile,
        flip the status back to PENDING_REVIEW and add a (deduped) review
        queue item. Returns True if a re-review was triggered.

        Caller passes the status *before* the edit so we know whether HR
        previously signed off on this profile.
        """
        if user.role == UserRole.ADMIN:
            return False
        if emp.user_id != user.id:
            return False
        if emp_status_before != ProfileStatus.APPROVED:
            return False

        emp.status = ProfileStatus.PENDING_REVIEW
        await self.db.flush()

        existing_stmt = select(ReviewQueueItem.id).where(
            ReviewQueueItem.employee_id == emp.id,
            ReviewQueueItem.status == ReviewStatus.PENDING,
        )
        existing = (await self.db.execute(existing_stmt)).scalar_one_or_none()
        if existing is None:
            self.db.add(
                ReviewQueueItem(
                    employee_id=emp.id,
                    submitted_by_user_id=user.id,
                    status=ReviewStatus.PENDING,
                )
            )
            await self.db.flush()
        return True

    # ── Search candidate projection ────────────────────

    @staticmethod
    def to_search_candidate(emp: Employee) -> dict[str, Any]:
        return {
            "id": str(emp.id),
            "full_name": emp.full_name,
            "headline": emp.headline,
            "location": emp.location,
            "years_experience": float(emp.years_experience) if emp.years_experience is not None else None,
            "allocation_status": emp.allocation_status.value,
            "last_project_end_date": emp.last_project_end_date.isoformat()
            if emp.last_project_end_date
            else None,
            "skills": [
                {
                    "name": s.name,
                    "category": s.category.value,
                    "proficiency": s.proficiency.value,
                    "years_experience": float(s.years_experience) if s.years_experience is not None else None,
                    "is_inferred": s.is_inferred,
                }
                for s in emp.skills
            ],
            "projects": [
                {
                    "title": p.title,
                    "description": p.description,
                    "role": p.role,
                    "domain": p.domain,
                    "start_date": p.start_date.isoformat() if p.start_date else None,
                    "end_date": p.end_date.isoformat() if p.end_date else None,
                    "tech_stack": p.tech_stack or [],
                }
                for p in emp.projects
            ],
        }

    @staticmethod
    def top_skill_names(emp: Employee, n: int = 4) -> list[str]:
        ranked = sorted(
            emp.skills,
            key=lambda s: (
                {"EXPERT": 3, "INTERMEDIATE": 2, "NOVICE": 1}.get(s.proficiency.value, 0),
                float(s.years_experience) if s.years_experience is not None else 0,
            ),
            reverse=True,
        )
        return [s.name for s in ranked if not s.is_inferred][:n]
