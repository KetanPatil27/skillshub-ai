"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-15 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role = sa.Enum("ADMIN", "USER", name="user_role")
allocation_status = sa.Enum("ALLOCATED", "UNALLOCATED", "PARTIAL", name="allocation_status")
profile_status = sa.Enum("PENDING_REVIEW", "APPROVED", "REJECTED", name="profile_status")
skill_category = sa.Enum("LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN", name="skill_category")
proficiency = sa.Enum("NOVICE", "INTERMEDIATE", "EXPERT", name="proficiency")
review_status = sa.Enum("PENDING", "APPROVED", "REJECTED", "EDITED_AND_APPROVED", name="review_status")


def upgrade() -> None:
    bind = op.get_bind()
    for e in (user_role, allocation_status, profile_status, skill_category, proficiency, review_status):
        e.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("email", sa.String(100), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM("ADMIN", "USER", name="user_role", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            unique=True,
        ),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("headline", sa.String(200), nullable=True),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column("years_experience", sa.Numeric(4, 1), nullable=True),
        sa.Column(
            "allocation_status",
            postgresql.ENUM("ALLOCATED", "UNALLOCATED", "PARTIAL", name="allocation_status", create_type=False),
            nullable=False,
        ),
        sa.Column("last_project_end_date", sa.Date(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("resume_url", sa.Text(), nullable=True),
        sa.Column("raw_extracted_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM("PENDING_REVIEW", "APPROVED", "REJECTED", name="profile_status", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_employees_location", "employees", ["location"])
    op.create_index("ix_employees_allocation_status", "employees", ["allocation_status"])
    op.create_index("ix_employees_status", "employees", ["status"])

    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN", name="skill_category", create_type=False
            ),
            nullable=False,
        ),
        sa.Column(
            "proficiency",
            postgresql.ENUM("NOVICE", "INTERMEDIATE", "EXPERT", name="proficiency", create_type=False),
            nullable=False,
        ),
        sa.Column("years_experience", sa.Numeric(4, 1), nullable=True),
        sa.Column("is_inferred", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("inference_confidence", sa.Numeric(3, 2), nullable=True),
        sa.Column("inference_reason", sa.Text(), nullable=True),
        sa.Column("evidence", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("employee_id", "name", name="uq_skills_employee_name"),
    )
    op.create_index("ix_skills_employee_id", "skills", ["employee_id"])
    op.create_index("ix_skills_name", "skills", ["name"])

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("role", sa.String(100), nullable=True),
        sa.Column("domain", sa.String(80), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("tech_stack", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_projects_employee_id", "projects", ["employee_id"])
    op.create_index("ix_projects_domain", "projects", ["domain"])

    op.create_table(
        "review_queue_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "submitted_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDING",
                "APPROVED",
                "REJECTED",
                "EDITED_AND_APPROVED",
                name="review_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_review_queue_items_employee_id", "review_queue_items", ["employee_id"])
    op.create_index("ix_review_queue_items_status", "review_queue_items", ["status"])

    op.create_table(
        "search_query_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("query_text", sa.Text(), nullable=False),
        sa.Column("result_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("top_match_score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("search_query_logs")
    op.drop_index("ix_review_queue_items_status", table_name="review_queue_items")
    op.drop_index("ix_review_queue_items_employee_id", table_name="review_queue_items")
    op.drop_table("review_queue_items")
    op.drop_index("ix_projects_domain", table_name="projects")
    op.drop_index("ix_projects_employee_id", table_name="projects")
    op.drop_table("projects")
    op.drop_index("ix_skills_name", table_name="skills")
    op.drop_index("ix_skills_employee_id", table_name="skills")
    op.drop_table("skills")
    op.drop_index("ix_employees_status", table_name="employees")
    op.drop_index("ix_employees_allocation_status", table_name="employees")
    op.drop_index("ix_employees_location", table_name="employees")
    op.drop_table("employees")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    for name in ("review_status", "proficiency", "skill_category", "profile_status", "allocation_status", "user_role"):
        sa.Enum(name=name).drop(bind, checkfirst=True)
