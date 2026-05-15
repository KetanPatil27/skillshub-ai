from __future__ import annotations

import hmac

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.modules.auth.schemas import (
    EmployeeRegisterRequest,
    HRRegisterRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterResponse,
)
from app.modules.employees.models import (
    AllocationStatus,
    Employee,
    ProfileStatus,
    Skill,
)
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate, UserResponse
from app.modules.users.service import UserService


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserService(db)

    # ── Registration ───────────────────────────────────

    async def register_employee(self, payload: EmployeeRegisterRequest) -> RegisterResponse:
        if not settings.ALLOW_EMPLOYEE_SIGNUP:
            raise ForbiddenError(
                "Signup is currently disabled. Please contact your administrator."
            )

        user = await self.users.create(
            UserCreate(
                name=payload.name,
                email=payload.email,
                password=payload.password,
                role=UserRole.USER,
            )
        )

        # Stub employee row — gives the resume-upload flow somewhere to land
        # extraction results without a second round-trip.
        emp = Employee(
            user_id=user.id,
            full_name=payload.name.strip(),
            status=ProfileStatus.PENDING_REVIEW,
            allocation_status=AllocationStatus.UNALLOCATED,
        )
        self.db.add(emp)
        await self.db.flush()
        await self.db.commit()

        return self._issue_register(user, employee_id=emp.id, next_action="upload_resume")

    async def register_hr(self, payload: HRRegisterRequest) -> RegisterResponse:
        if not settings.ALLOW_HR_SIGNUP:
            raise ForbiddenError(
                "Signup is currently disabled. Please contact your administrator."
            )

        # Constant-time compare — defeats response-time side channels on the code.
        if not hmac.compare_digest(payload.invite_code, settings.HR_INVITE_CODE):
            raise ForbiddenError("Invalid invite code.")

        user = await self.users.create(
            UserCreate(
                name=payload.name,
                email=payload.email,
                password=payload.password,
                role=UserRole.ADMIN,
            )
        )
        await self.db.commit()

        return self._issue_register(user, employee_id=None, next_action="search")

    # ── Login + Me ─────────────────────────────────────

    async def login(self, payload: LoginRequest) -> LoginResponse:
        user = await self.users.get_by_email(payload.email)
        # Generic message — never reveal whether the email exists.
        if user is None or not verify_password(payload.password, user.password):
            raise UnauthorizedError("Invalid email or password.")

        employee_id = await self._employee_id_for(user)
        return LoginResponse(
            access_token=create_access_token(user.id, user.role.value),
            expires_in=settings.JWT_EXPIRATION_MINUTES * 60,
            user=UserResponse.model_validate(user),
            employee_id=employee_id,
        )

    async def me(self, user: User) -> MeResponse:
        employee_id = await self._employee_id_for(user)
        has_completed_profile = False
        if employee_id:
            from sqlalchemy import select, func
            stmt = select(func.count(Skill.id)).where(Skill.employee_id == employee_id)
            count = (await self.db.execute(stmt)).scalar() or 0
            has_completed_profile = count > 0

        return MeResponse(
            user=UserResponse.model_validate(user),
            employee_id=employee_id,
            has_completed_profile=has_completed_profile,
        )

    # ── Internals ──────────────────────────────────────

    async def _employee_id_for(self, user: User):
        if user.role != UserRole.USER:
            return None
        stmt = select(Employee.id).where(Employee.user_id == user.id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    def _issue_register(
        self,
        user: User,
        *,
        employee_id,
        next_action: str,
    ) -> RegisterResponse:
        return RegisterResponse(
            access_token=create_access_token(user.id, user.role.value),
            expires_in=settings.JWT_EXPIRATION_MINUTES * 60,
            user=UserResponse.model_validate(user),
            employee_id=employee_id,
            next_action=next_action,  # type: ignore[arg-type]
        )
