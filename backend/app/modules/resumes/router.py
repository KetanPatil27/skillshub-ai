from fastapi import APIRouter, File, UploadFile

from app.common.dependencies import CurrentUser, DbSession
from app.modules.employees.schemas import EmployeeResponse
from app.modules.resumes.schemas import ResumeUploadResponse
from app.modules.resumes.service import ResumeService

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    summary="Upload a resume PDF and run AI extraction + inference",
    description=(
        "Multipart upload of a PDF resume. The server extracts text, calls the "
        "extraction model, runs related-skill inference, persists the profile in "
        "PENDING_REVIEW state, and creates a review queue item."
    ),
)
async def upload_resume(
    user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
) -> ResumeUploadResponse:
    content = await file.read()
    emp, extracted, inferred, resume_url = await ResumeService(db).upload_and_extract(
        user=user, filename=file.filename or "resume.pdf", content=content
    )
    return ResumeUploadResponse(
        employee=EmployeeResponse.model_validate(emp),
        extracted=extracted,
        inferred_skills=inferred,
        resume_url=resume_url,
    )
