from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.modules.employees.schemas import EmployeeResponse
from app.modules.review.models import ReviewStatus


class ReviewQueueListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    submitted_by_user_id: UUID | None
    status: ReviewStatus
    reviewer_id: UUID | None
    reviewer_notes: str | None
    created_at: datetime
    reviewed_at: datetime | None
    employee_name: str | None = None
    employee_headline: str | None = None


class ReviewQueueItemWithEmployee(BaseModel):
    item: ReviewQueueListItem
    employee: EmployeeResponse


class ReviewDecisionRequest(BaseModel):
    notes: str | None = None


class ReviewListResponse(BaseModel):
    items: list[ReviewQueueListItem]
    total: int
