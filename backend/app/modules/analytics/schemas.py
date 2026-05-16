from pydantic import BaseModel, Field


class SkillStat(BaseModel):
    name: str
    category: str
    count: int
    expert_count: int


class LocationStat(BaseModel):
    name: str
    count: int


class AnalyticsOverview(BaseModel):
    total_approved: int
    total_pending: int
    total_skills_tracked: int
    inferred_ratio: float = Field(ge=0.0, le=1.0)
    allocation_breakdown: dict[str, int]
    top_skills: list[SkillStat]
    scarce_skills: list[SkillStat]
    category_breakdown: dict[str, int]
    location_breakdown: list[LocationStat]
    hiring_recommendations: list[str]
