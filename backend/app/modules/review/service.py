from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.employees.models import ProfileStatus
from app.modules.employees.service import EmployeeService
from app.modules.review.models import ReviewQueueItem, ReviewStatus
from app.modules.users.models import User


class ReviewService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_pending(self) -> tuple[list[ReviewQueueItem], int]:
        stmt = (
            select(ReviewQueueItem)
            .where(ReviewQueueItem.status == ReviewStatus.PENDING)
            .order_by(ReviewQueueItem.created_at.asc())
        )
        items = list((await self.db.execute(stmt)).scalars().all())
        total = (
            await self.db.execute(
                select(func.count()).select_from(ReviewQueueItem).where(
                    ReviewQueueItem.status == ReviewStatus.PENDING
                )
            )
        ).scalar_one()
        return items, int(total)

    async def get(self, item_id: UUID) -> ReviewQueueItem:
        item = await self.db.get(ReviewQueueItem, item_id)
        if item is None:
            raise NotFoundError("Review item not found")
        return item

    async def approve(self, item_id: UUID, reviewer: User, notes: str | None) -> ReviewQueueItem:
        item = await self.get(item_id)
        if item.status != ReviewStatus.PENDING:
            raise ConflictError("Review item is already resolved")
        item.status = ReviewStatus.APPROVED
        item.reviewer_id = reviewer.id
        item.reviewer_notes = notes
        item.reviewed_at = datetime.now(timezone.utc)
        await EmployeeService(self.db).set_status(item.employee_id, ProfileStatus.APPROVED)
        await self.db.commit()
        return item

    async def reject(self, item_id: UUID, reviewer: User, notes: str | None) -> ReviewQueueItem:
        item = await self.get(item_id)
        if item.status != ReviewStatus.PENDING:
            raise ConflictError("Review item is already resolved")
        item.status = ReviewStatus.REJECTED
        item.reviewer_id = reviewer.id
        item.reviewer_notes = notes
        item.reviewed_at = datetime.now(timezone.utc)
        await EmployeeService(self.db).set_status(item.employee_id, ProfileStatus.REJECTED)
        await self.db.commit()
        return item

    async def mark_edited_and_approved(
        self, item_id: UUID, reviewer: User, notes: str | None
    ) -> ReviewQueueItem:
        item = await self.get(item_id)
        item.status = ReviewStatus.EDITED_AND_APPROVED
        item.reviewer_id = reviewer.id
        item.reviewer_notes = notes
        item.reviewed_at = datetime.now(timezone.utc)
        await EmployeeService(self.db).set_status(item.employee_id, ProfileStatus.APPROVED)
        await self.db.commit()
        return item
