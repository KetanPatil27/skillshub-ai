from typing import Literal

from pydantic import BaseModel, Field

SkillCategoryLit = Literal["LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN"]
ProficiencyLit = Literal["NOVICE", "INTERMEDIATE", "EXPERT"]


class ExtractedSkill(BaseModel):
    name: str
    category: SkillCategoryLit
    proficiency: ProficiencyLit
    years_experience: float | None = None
    evidence: str | None = None


class ExtractedProject(BaseModel):
    title: str
    description: str | None = None
    role: str | None = None
    domain: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    tech_stack: list[str] = Field(default_factory=list)


class ExtractedProfile(BaseModel):
    full_name: str
    headline: str | None = None
    location: str | None = None
    years_experience: float | None = None
    skills: list[ExtractedSkill] = Field(default_factory=list)
    projects: list[ExtractedProject] = Field(default_factory=list)


class InferredSkill(BaseModel):
    name: str
    category: SkillCategoryLit
    proficiency: ProficiencyLit
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str


class SearchResult(BaseModel):
    employee_id: str
    name: str
    headline: str | None = None
    location: str | None = None
    allocation_status: str | None = None
    match_score: int = Field(ge=0, le=100)
    reason: str
    matched_skill_names: list[str] = Field(default_factory=list)
    evidence_snippets: list[str] = Field(default_factory=list)


class TeamMember(BaseModel):
    employee_id: str
    name: str
    role_on_team: str
    why_picked: str


class TeamAlternate(BaseModel):
    employee_id: str
    name: str
    would_replace: str


class TeamBuildResult(BaseModel):
    team: list[TeamMember]
    rationale: str
    alternates: list[TeamAlternate] = Field(default_factory=list)
