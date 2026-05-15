from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.core.security import hash_password
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, payload: UserCreate) -> User:
        existing = await self.get_by_email(payload.email)
        if existing:
            raise ConflictError("Email is already registered")
        user = User(
            name=payload.name.strip(),
            email=payload.email.lower(),
            password=hash_password(payload.password),
            role=payload.role,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def upsert_seed(
        self, *, name: str, email: str, password: str, role: UserRole
    ) -> User:
        user = await self.get_by_email(email)
        if user:
            user.name = name
            user.role = role
            user.password = hash_password(password)
            await self.db.flush()
            await self.db.refresh(user)
            return user
        return await self.create(
            UserCreate(name=name, email=email, password=password, role=role)
        )
