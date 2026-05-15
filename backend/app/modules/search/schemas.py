from pydantic import BaseModel, Field

from app.modules.ai.schemas import SearchResult, TeamBuildResult


class SearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    limit: int = Field(default=5, ge=1, le=10)


class TeamBuildRequest(BaseModel):
    brief: str = Field(min_length=5, max_length=600)
    team_size: int = Field(default=4, ge=2, le=8)


__all__ = ["SearchRequest", "TeamBuildRequest", "SearchResult", "TeamBuildResult"]
