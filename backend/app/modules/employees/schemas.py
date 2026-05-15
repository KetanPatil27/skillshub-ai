from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.employees.models import (
    AllocationStatus,
    Proficiency,
    ProfileStatus,
    SkillCategory,
)


# ── Skill ───────────────────────────────────────────
class SkillBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: SkillCategory
    proficiency: Proficiency
    years_experience: float | None = None
    is_inferred: bool = False
    inference_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    inference_reason: str | None = None
    evidence: str | None = None


class SkillCreate(SkillBase):
    pass


class SkillResponse(SkillBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


# ── Project ─────────────────────────────────────────
class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    role: str | None = None
    domain: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    tech_stack: list[str] = Field(default_factory=list)


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


# ── Employee ────────────────────────────────────────
class EmployeeBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    headline: str | None = None
    location: str | None = None
    years_experience: float | None = None
    allocation_status: AllocationStatus = AllocationStatus.UNALLOCATED
    last_project_end_date: date | None = None
    bio: str | None = None


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    headline: str | None = None
    location: str | None = None
    years_experience: float | None = None
    allocation_status: AllocationStatus | None = None
    last_project_end_date: date | None = None
    bio: str | None = None


class EmployeeCreate(EmployeeBase):
    user_id: UUID | None = None
    skills: list[SkillCreate] = Field(default_factory=list)
    projects: list[ProjectCreate] = Field(default_factory=list)


class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID | None = None
    resume_url: str | None = None
    status: ProfileStatus
    created_at: datetime
    updated_at: datetime
    skills: list[SkillResponse] = Field(default_factory=list)
    projects: list[ProjectResponse] = Field(default_factory=list)


class EmployeeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    headline: str | None = None
    location: str | None = None
    years_experience: float | None = None
    allocation_status: AllocationStatus
    status: ProfileStatus
    top_skills: list[str] = Field(default_factory=list)


class EmployeeListResponse(BaseModel):
    items: list[EmployeeListItem]
    total: int
    page: int
    page_size: int


class EmployeeFilter(BaseModel):
    location: str | None = None
    allocation_status: AllocationStatus | None = None
    min_years: float | None = None
    status: ProfileStatus | None = None
    q: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=12, ge=1, le=50)
