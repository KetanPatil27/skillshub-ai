from uuid import UUID

from fastapi import APIRouter, Depends

from app.common.decorators import require_admin
from app.common.dependencies import DbSession
from app.modules.employees.schemas import EmployeeResponse
from app.modules.employees.service import EmployeeService
from app.modules.review.schemas import (
    ReviewDecisionRequest,
    ReviewListResponse,
    ReviewQueueItemWithEmployee,
    ReviewQueueListItem,
)
from app.modules.review.service import ReviewService

router = APIRouter(
    prefix="/review",
    tags=["Review"],
    dependencies=[Depends(require_admin)],
)


@router.get(
    "/queue",
    response_model=ReviewListResponse,
    summary="List pending review items (HR only)",
)
async def list_queue(db: DbSession) -> ReviewListResponse:
    items, total = await ReviewService(db).list_pending()
    return ReviewListResponse(
        items=[ReviewQueueListItem.model_validate(i) for i in items],
        total=total,
    )


@router.get(
    "/{item_id}",
    response_model=ReviewQueueItemWithEmployee,
    summary="Get a single review item with the associated employee profile",
)
async def get_item(item_id: UUID, db: DbSession) -> ReviewQueueItemWithEmployee:
    item = await ReviewService(db).get(item_id)
    emp = await EmployeeService(db).get(item.employee_id)
    return ReviewQueueItemWithEmployee(
        item=ReviewQueueListItem.model_validate(item),
        employee=EmployeeResponse.model_validate(emp),
    )


@router.post(
    "/{item_id}/approve",
    response_model=ReviewQueueListItem,
    summary="Approve a pending review item",
)
async def approve(
    item_id: UUID,
    body: ReviewDecisionRequest,
    db: DbSession,
    reviewer=Depends(require_admin),
) -> ReviewQueueListItem:
    item = await ReviewService(db).approve(item_id, reviewer, body.notes)
    return ReviewQueueListItem.model_validate(item)


@router.post(
    "/{item_id}/reject",
    response_model=ReviewQueueListItem,
    summary="Reject a pending review item",
)
async def reject(
    item_id: UUID,
    body: ReviewDecisionRequest,
    db: DbSession,
    reviewer=Depends(require_admin),
) -> ReviewQueueListItem:
    item = await ReviewService(db).reject(item_id, reviewer, body.notes)
    return ReviewQueueListItem.model_validate(item)


@router.post(
    "/{item_id}/edit-and-approve",
    response_model=ReviewQueueListItem,
    summary="Mark the item as edited-and-approved (after HR has saved edits separately)",
)
async def edit_and_approve(
    item_id: UUID,
    body: ReviewDecisionRequest,
    db: DbSession,
    reviewer=Depends(require_admin),
) -> ReviewQueueListItem:
    item = await ReviewService(db).mark_edited_and_approved(item_id, reviewer, body.notes)
    return ReviewQueueListItem.model_validate(item)
