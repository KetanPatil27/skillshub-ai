from __future__ import annotations

from sqlalchemy import Integer, case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.schemas import (
    AnalyticsOverview,
    LocationStat,
    SkillStat,
)
from app.modules.employees.models import (
    AllocationStatus,
    Employee,
    Proficiency,
    ProfileStatus,
    Skill,
    SkillCategory,
)


class AnalyticsService:
    """Pure aggregate queries over approved employee profiles.

    All metrics are computed live — no caching, no separate analytics tables.
    For hackathon-scale data (15-30 profiles) this is fine; if profile count
    grows past ~1k we'd add a materialised view or scheduled rollup.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def overview(self) -> AnalyticsOverview:
        total_approved = await self._count_employees(ProfileStatus.APPROVED)
        total_pending = await self._count_employees(ProfileStatus.PENDING_REVIEW)
        allocation_breakdown = await self._allocation_breakdown()
        top_skills = await self._top_skills(limit=12)
        scarce_skills = await self._scarce_skills(limit=6)
        category_breakdown = await self._category_breakdown()
        location_breakdown = await self._location_breakdown(limit=6)
        inferred_ratio = await self._inferred_ratio()
        total_skills_tracked = await self._distinct_skill_count()
        hiring_recommendations = self._derive_hiring_recommendations(
            scarce_skills=scarce_skills,
            category_breakdown=category_breakdown,
            allocation_breakdown=allocation_breakdown,
            total_approved=total_approved,
        )

        return AnalyticsOverview(
            total_approved=total_approved,
            total_pending=total_pending,
            total_skills_tracked=total_skills_tracked,
            inferred_ratio=inferred_ratio,
            allocation_breakdown=allocation_breakdown,
            top_skills=top_skills,
            scarce_skills=scarce_skills,
            category_breakdown=category_breakdown,
            location_breakdown=location_breakdown,
            hiring_recommendations=hiring_recommendations,
        )

    # ── Building blocks ────────────────────────────────────────────────

    async def _count_employees(self, status: ProfileStatus) -> int:
        stmt = (
            select(func.count())
            .select_from(Employee)
            .where(Employee.status == status)
        )
        return int((await self.db.execute(stmt)).scalar_one())

    async def _allocation_breakdown(self) -> dict[str, int]:
        stmt = (
            select(Employee.allocation_status, func.count())
            .where(Employee.status == ProfileStatus.APPROVED)
            .group_by(Employee.allocation_status)
        )
        rows = (await self.db.execute(stmt)).all()
        out: dict[str, int] = {a.value: 0 for a in AllocationStatus}
        for status, count in rows:
            out[status.value] = int(count)
        return out

    async def _top_skills(self, limit: int) -> list[SkillStat]:
        expert_sum = func.sum(
            case((Skill.proficiency == Proficiency.EXPERT, 1), else_=0)
        ).label("expert_count")
        stmt = (
            select(
                Skill.name,
                Skill.category,
                func.count(Skill.id).label("total"),
                expert_sum,
            )
            .join(Employee, Skill.employee_id == Employee.id)
            .where(Employee.status == ProfileStatus.APPROVED)
            .where(Skill.is_inferred.is_(False))
            .group_by(Skill.name, Skill.category)
            .order_by(func.count(Skill.id).desc(), Skill.name.asc())
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            SkillStat(
                name=name,
                category=category.value,
                count=int(total),
                expert_count=int(experts or 0),
            )
            for name, category, total, experts in rows
        ]

    async def _scarce_skills(self, limit: int) -> list[SkillStat]:
        """Skills the org *uses* but has no experts in.

        Heuristic: count >= 2 explicit holders and 0 EXPERT-level holders.
        These are the highest-signal hiring targets — multiple projects need
        it, nobody is deep on it.
        """
        expert_sum = func.sum(
            case((Skill.proficiency == Proficiency.EXPERT, 1), else_=0)
        ).label("expert_count")
        stmt = (
            select(
                Skill.name,
                Skill.category,
                func.count(Skill.id).label("total"),
                expert_sum,
            )
            .join(Employee, Skill.employee_id == Employee.id)
            .where(Employee.status == ProfileStatus.APPROVED)
            .where(Skill.is_inferred.is_(False))
            .group_by(Skill.name, Skill.category)
            .having(func.count(Skill.id) >= 2)
            .having(expert_sum == 0)
            .order_by(func.count(Skill.id).desc(), Skill.name.asc())
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            SkillStat(
                name=name,
                category=category.value,
                count=int(total),
                expert_count=int(experts or 0),
            )
            for name, category, total, experts in rows
        ]

    async def _category_breakdown(self) -> dict[str, int]:
        stmt = (
            select(Skill.category, func.count(Skill.id))
            .join(Employee, Skill.employee_id == Employee.id)
            .where(Employee.status == ProfileStatus.APPROVED)
            .where(Skill.is_inferred.is_(False))
            .group_by(Skill.category)
        )
        rows = (await self.db.execute(stmt)).all()
        out: dict[str, int] = {c.value: 0 for c in SkillCategory}
        for category, count in rows:
            out[category.value] = int(count)
        return out

    async def _location_breakdown(self, limit: int) -> list[LocationStat]:
        stmt = (
            select(Employee.location, func.count())
            .where(Employee.status == ProfileStatus.APPROVED)
            .where(Employee.location.isnot(None))
            .group_by(Employee.location)
            .order_by(func.count().desc(), Employee.location.asc())
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [LocationStat(name=name, count=int(count)) for name, count in rows]

    async def _inferred_ratio(self) -> float:
        inferred_sum = func.sum(
            case((Skill.is_inferred.is_(True), 1), else_=0)
        )
        stmt = (
            select(inferred_sum, func.count(Skill.id))
            .join(Employee, Skill.employee_id == Employee.id)
            .where(Employee.status == ProfileStatus.APPROVED)
        )
        row = (await self.db.execute(stmt)).one_or_none()
        if not row:
            return 0.0
        inferred, total = row
        total = int(total or 0)
        if total == 0:
            return 0.0
        return round(int(inferred or 0) / total, 3)

    async def _distinct_skill_count(self) -> int:
        stmt = (
            select(func.count(distinct(Skill.name)))
            .join(Employee, Skill.employee_id == Employee.id)
            .where(Employee.status == ProfileStatus.APPROVED)
            .where(Skill.is_inferred.is_(False))
        )
        return int((await self.db.execute(stmt)).scalar_one() or 0)

    # ── Derived recommendations (no LLM, fully deterministic) ──────────

    @staticmethod
    def _derive_hiring_recommendations(
        *,
        scarce_skills: list[SkillStat],
        category_breakdown: dict[str, int],
        allocation_breakdown: dict[str, int],
        total_approved: int,
    ) -> list[str]:
        recs: list[str] = []

        for s in scarce_skills[:3]:
            recs.append(
                f"{s.count} engineers use {s.name} but none at expert level — "
                f"hire or upskill a senior {s.name} specialist."
            )

        empty_categories = [
            cat for cat, count in category_breakdown.items() if count == 0
        ]
        if "DOMAIN" in empty_categories and total_approved >= 3:
            recs.append(
                "No domain expertise tagged on any profile — encourage "
                "engineers to mark their industry experience (Fintech, "
                "Healthcare, etc.) so HR can match by sector."
            )

        if total_approved >= 5:
            allocated = allocation_breakdown.get(AllocationStatus.ALLOCATED.value, 0)
            if total_approved and allocated / total_approved >= 0.85:
                recs.append(
                    f"{allocated} of {total_approved} engineers are fully "
                    "allocated — capacity is tight. Consider hiring before "
                    "the next staffing request."
                )

        return recs[:4]
