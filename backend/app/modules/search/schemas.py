from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.ai.schemas import SearchResult, TeamBuildResult


class SearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    limit: int = Field(default=5, ge=1, le=10)


class JDSearchRequest(BaseModel):
    job_description: str = Field(min_length=30, max_length=8000)
    limit: int = Field(default=5, ge=1, le=10)


class TeamBuildRequest(BaseModel):
    brief: str = Field(min_length=5, max_length=600)
    team_size: int = Field(default=4, ge=2, le=8)


class RecentSearchItem(BaseModel):
    query_text: str
    last_used_at: datetime
    use_count: int


class SavedSearchCreate(BaseModel):
    query_text: str = Field(min_length=3, max_length=500)
    label: str | None = Field(default=None, max_length=120)


class SavedSearchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    query_text: str
    label: str | None = None
    created_at: datetime


__all__ = [
    "SearchRequest",
    "JDSearchRequest",
    "TeamBuildRequest",
    "SearchResult",
    "TeamBuildResult",
    "RecentSearchItem",
    "SavedSearchCreate",
    "SavedSearchResponse",
]
