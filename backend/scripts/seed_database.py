"""Seed the database with the two demo accounts and the 15 employee profiles.

Run from the backend/ directory:
    python -m scripts.seed_database
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.modules.employees.models import (
    AllocationStatus,
    Employee,
    ProfileStatus,
    Project,
    Skill,
)
from app.modules.review.models import ReviewQueueItem, ReviewStatus
from app.modules.users.models import UserRole
from app.modules.users.service import UserService

SEED_PATH = Path(__file__).resolve().parents[1] / "seed_data" / "profiles.json"


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        pass
    try:
        return datetime.strptime(s, "%Y-%m").date().replace(day=1)
    except ValueError:
        return None


async def _seed():
    if not SEED_PATH.exists():
        print(f"Seed file not found at {SEED_PATH}", file=sys.stderr)
        sys.exit(1)

    profiles = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(profiles)} profiles from {SEED_PATH.name}")

    async with AsyncSessionLocal() as db:
        users = UserService(db)

        # 1. Two seeded accounts
        hr_user = await users.upsert_seed(
            name="HR Demo",
            email=settings.SEED_HR_EMAIL,
            password=settings.SEED_HR_PASSWORD,
            role=UserRole.ADMIN,
        )
        emp_user = await users.upsert_seed(
            name="Ravi Sharma",
            email=settings.SEED_EMP_EMAIL,
            password=settings.SEED_EMP_PASSWORD,
            role=UserRole.USER,
        )
        await db.commit()
        print(f"Upserted HR user        -> {hr_user.email}")
        print(f"Upserted Employee user  -> {emp_user.email}")

        # 2. Wipe any prior demo employees (idempotent reseed).
        existing = (await db.execute(select(Employee))).scalars().all()
        for e in existing:
            await db.delete(e)
        await db.commit()
        print(f"Cleared {len(existing)} existing employee profiles")

        # 3. Insert 15 profiles, all APPROVED so search works immediately.
        for i, p in enumerate(profiles, start=1):
            user_id = emp_user.id if p.get("is_demo_employee") else None
            emp = Employee(
                user_id=user_id,
                full_name=p["full_name"],
                headline=p.get("headline"),
                location=p.get("location"),
                years_experience=p.get("years_experience"),
                allocation_status=AllocationStatus(p.get("allocation_status", "UNALLOCATED")),
                last_project_end_date=_parse_date(p.get("last_project_end_date")),
                bio=p.get("bio"),
                raw_extracted_json=p,
                status=ProfileStatus.APPROVED,
            )
            db.add(emp)
            await db.flush()

            for s in p.get("skills", []):
                db.add(
                    Skill(
                        employee_id=emp.id,
                        name=s["name"],
                        category=s["category"],
                        proficiency=s["proficiency"],
                        years_experience=s.get("years_experience"),
                        is_inferred=s.get("is_inferred", False),
                        inference_confidence=s.get("inference_confidence"),
                        inference_reason=s.get("inference_reason"),
                        evidence=s.get("evidence"),
                    )
                )

            for proj in p.get("projects", []):
                db.add(
                    Project(
                        employee_id=emp.id,
                        title=proj["title"],
                        description=proj.get("description"),
                        role=proj.get("role"),
                        domain=proj.get("domain"),
                        start_date=_parse_date(proj.get("start_date")),
                        end_date=_parse_date(proj.get("end_date")),
                        tech_stack=proj.get("tech_stack", []),
                    )
                )

            # Add a pre-approved review item for audit trail.
            db.add(
                ReviewQueueItem(
                    employee_id=emp.id,
                    submitted_by_user_id=emp_user.id if user_id else None,
                    status=ReviewStatus.APPROVED,
                    reviewer_id=hr_user.id,
                    reviewer_notes="Seeded as pre-approved demo data.",
                    reviewed_at=datetime.now(timezone.utc),
                )
            )

            await db.commit()
            print(f"  [{i:2d}] {p['full_name']:25s} {p.get('location'):12s} {p.get('allocation_status'):11s}")

        print("\nSeed complete. Demo accounts:")
        print(f"  HR        -> {settings.SEED_HR_EMAIL} / {settings.SEED_HR_PASSWORD}")
        print(f"  Employee  -> {settings.SEED_EMP_EMAIL} / {settings.SEED_EMP_PASSWORD}")


def main() -> None:
    asyncio.run(_seed())


if __name__ == "__main__":
    main()
