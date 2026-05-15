from __future__ import annotations

from fastapi import APIRouter, Depends

from app.common.dependencies import CurrentUser, DbSession
from app.common.rate_limit import auth_rate_limit
from app.modules.auth.schemas import (
    EmployeeRegisterRequest,
    HRRegisterRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register/employee",
    response_model=RegisterResponse,
    status_code=201,
    dependencies=[Depends(auth_rate_limit)],
    summary="Register a new employee user (open self-service)",
)
async def register_employee(
    payload: EmployeeRegisterRequest, db: DbSession
) -> RegisterResponse:
    return await AuthService(db).register_employee(payload)


@router.post(
    "/register/hr",
    response_model=RegisterResponse,
    status_code=201,
    dependencies=[Depends(auth_rate_limit)],
    summary="Register a new HR user (requires invite code)",
)
async def register_hr(payload: HRRegisterRequest, db: DbSession) -> RegisterResponse:
    return await AuthService(db).register_hr(payload)


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(auth_rate_limit)],
    summary="Log in and receive a JWT bearer token",
)
async def login(payload: LoginRequest, db: DbSession) -> LoginResponse:
    return await AuthService(db).login(payload)


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Current user (used to rehydrate session on refresh)",
)
async def me(user: CurrentUser, db: DbSession) -> MeResponse:
    return await AuthService(db).me(user)
