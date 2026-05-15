from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate, UserResponse
from app.modules.users.service import UserService


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserService(db)

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        user = await self.users.create(
            UserCreate(
                name=payload.name,
                email=payload.email,
                password=payload.password,
                role=UserRole.USER,
            )
        )
        await self.db.commit()
        return self._issue_token(user)

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password):
            raise UnauthorizedError("Invalid email or password")
        return self._issue_token(user)

    @staticmethod
    def _issue_token(user: User) -> TokenResponse:
        token = create_access_token(user.id, user.role.value)
        return TokenResponse(
            access_token=token,
            expires_in=settings.JWT_EXPIRATION_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
