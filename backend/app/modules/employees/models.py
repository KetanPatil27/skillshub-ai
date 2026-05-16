import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AllocationStatus(str, enum.Enum):
    ALLOCATED = "ALLOCATED"
    UNALLOCATED = "UNALLOCATED"
    PARTIAL = "PARTIAL"


class ProfileStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class SkillCategory(str, enum.Enum):
    LANGUAGE = "LANGUAGE"
    FRAMEWORK = "FRAMEWORK"
    PLATFORM = "PLATFORM"
    TOOL = "TOOL"
    DOMAIN = "DOMAIN"


class Proficiency(str, enum.Enum):
    NOVICE = "NOVICE"
    INTERMEDIATE = "INTERMEDIATE"
    EXPERT = "EXPERT"


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        Index("ix_employees_location", "location"),
        Index("ix_employees_allocation_status", "allocation_status"),
        Index("ix_employees_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    headline: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    years_experience: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    allocation_status: Mapped[AllocationStatus] = mapped_column(
        Enum(AllocationStatus, name="allocation_status"),
        default=AllocationStatus.UNALLOCATED,
        nullable=False,
    )
    last_project_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_content: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_extracted_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[ProfileStatus] = mapped_column(
        Enum(ProfileStatus, name="profile_status"),
        default=ProfileStatus.PENDING_REVIEW,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    @property
    def has_resume(self) -> bool:
        return self.resume_content is not None or self.resume_url is not None

    user = relationship("User", back_populates="employee")
    skills = relationship(
        "Skill", back_populates="employee", cascade="all, delete-orphan", lazy="selectin"
    )
    projects = relationship(
        "Project", back_populates="employee", cascade="all, delete-orphan", lazy="selectin"
    )
    review_items = relationship(
        "ReviewQueueItem", back_populates="employee", cascade="all, delete-orphan"
    )


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("employee_id", "name", name="uq_skills_employee_name"),
        Index("ix_skills_employee_id", "employee_id"),
        Index("ix_skills_name", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    category: Mapped[SkillCategory] = mapped_column(
        Enum(SkillCategory, name="skill_category"), nullable=False
    )
    proficiency: Mapped[Proficiency] = mapped_column(
        Enum(Proficiency, name="proficiency"), nullable=False
    )
    years_experience: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    is_inferred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    inference_confidence: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    inference_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    employee = relationship("Employee", back_populates="skills")


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        Index("ix_projects_employee_id", "employee_id"),
        Index("ix_projects_domain", "domain"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(80), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tech_stack: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    employee = relationship("Employee", back_populates="projects")
