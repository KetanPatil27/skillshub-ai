from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.common.dependencies import CurrentUser, DbSession
from app.modules.employees.schemas import (
    EmployeeFilter,
    EmployeeListItem,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeUpdate,
    ProjectCreate,
    SkillCreate,
)
from app.modules.employees.service import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])


def _filter_dep(
    location: str | None = Query(default=None),
    allocation_status: str | None = Query(default=None),
    min_years: float | None = Query(default=None),
    status_: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
) -> EmployeeFilter:
    return EmployeeFilter(
        location=location,
        allocation_status=allocation_status,  # type: ignore[arg-type]
        min_years=min_years,
        status=status_,  # type: ignore[arg-type]
        q=q,
        page=page,
        page_size=page_size,
    )


@router.get(
    "",
    response_model=EmployeeListResponse,
    summary="List employees (HR directory)",
)
async def list_employees(
    user: CurrentUser,
    db: DbSession,
    f: Annotated[EmployeeFilter, Depends(_filter_dep)],
) -> EmployeeListResponse:
    rows, total = await EmployeeService(db).list_page(f)
    items = [
        EmployeeListItem(
            id=e.id,
            full_name=e.full_name,
            headline=e.headline,
            location=e.location,
            years_experience=float(e.years_experience) if e.years_experience is not None else None,
            allocation_status=e.allocation_status,
            status=e.status,
            top_skills=EmployeeService.top_skill_names(e),
        )
        for e in rows
    ]
    return EmployeeListResponse(
        items=items, total=total, page=f.page, page_size=f.page_size
    )


@router.get(
    "/me",
    response_model=EmployeeResponse,
    summary="The logged-in employee's own profile",
)
async def my_profile(user: CurrentUser, db: DbSession) -> EmployeeResponse:
    emp = await EmployeeService(db).get_by_user_id(user.id)
    if emp is None:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("No employee profile linked to your account yet")
    return EmployeeResponse.model_validate(emp)


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get a single employee profile",
)
async def get_employee(
    employee_id: UUID, user: CurrentUser, db: DbSession
) -> EmployeeResponse:
    svc = EmployeeService(db)
    emp = await svc.get(employee_id)
    svc.ensure_can_view(user, emp)
    return EmployeeResponse.model_validate(emp)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update an employee profile",
)
async def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    user: CurrentUser,
    db: DbSession,
) -> EmployeeResponse:
    svc = EmployeeService(db)
    emp = await svc.get(employee_id)
    svc.ensure_can_edit(user, emp)
    updated = await svc.update(employee_id, payload)
    await db.commit()
    return EmployeeResponse.model_validate(updated)


@router.put(
    "/{employee_id}/skills",
    response_model=EmployeeResponse,
    summary="Replace the skill set of an employee",
)
async def replace_skills(
    employee_id: UUID,
    skills: list[SkillCreate],
    user: CurrentUser,
    db: DbSession,
) -> EmployeeResponse:
    svc = EmployeeService(db)
    emp = await svc.get(employee_id)
    svc.ensure_can_edit(user, emp)
    await svc.replace_skills(employee_id, skills)
    await db.commit()
    return EmployeeResponse.model_validate(await svc.get(employee_id))


@router.put(
    "/{employee_id}/projects",
    response_model=EmployeeResponse,
    summary="Replace the project set of an employee",
)
async def replace_projects(
    employee_id: UUID,
    projects: list[ProjectCreate],
    user: CurrentUser,
    db: DbSession,
) -> EmployeeResponse:
    svc = EmployeeService(db)
    emp = await svc.get(employee_id)
    svc.ensure_can_edit(user, emp)
    await svc.replace_projects(employee_id, projects)
    await db.commit()
    return EmployeeResponse.model_validate(await svc.get(employee_id))
