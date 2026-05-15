from fastapi import APIRouter

from app.common.dependencies import CurrentUser
from app.modules.users.schemas import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
