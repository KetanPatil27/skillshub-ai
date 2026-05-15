from pydantic import BaseModel

from app.modules.ai.schemas import ExtractedProfile, InferredSkill
from app.modules.employees.schemas import EmployeeResponse


class ResumeUploadResponse(BaseModel):
    employee: EmployeeResponse
    extracted: ExtractedProfile
    inferred_skills: list[InferredSkill]
    resume_url: str | None = None
