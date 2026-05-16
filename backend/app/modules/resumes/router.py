from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse

from app.common.decorators import require_admin
from app.common.dependencies import CurrentUser, DbSession
from app.core.exceptions import BadRequestError
from app.modules.employees.schemas import EmployeeResponse
from app.modules.resumes.schemas import ResumeUploadResponse
from app.modules.resumes.service import BULK_MAX_FILES, ResumeService

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


@router.post(
    "/bulk",
    dependencies=[Depends(require_admin)],
    response_class=StreamingResponse,
    summary="Bulk upload PDFs (HR only). Streams SSE events per file.",
    description=(
        "Multipart upload of multiple PDF resumes. Each file is processed "
        "sequentially through the same extraction + inference + review-queue "
        "pipeline. Server-Sent Events stream per-file progress: `file_start`, "
        "`file_done` (with extracted_name + counts), `file_error`, and a "
        "final `done` summary."
    ),
)
async def bulk_upload(
    user: CurrentUser,
    db: DbSession,
    files: list[UploadFile] = File(...),
) -> StreamingResponse:
    if not files:
        raise BadRequestError("No files provided")
    if len(files) > BULK_MAX_FILES:
        raise BadRequestError(f"Maximum {BULK_MAX_FILES} files per batch")

    payloads: list[tuple[str, bytes]] = []
    for f in files:
        payloads.append((f.filename or "resume.pdf", await f.read()))

    generator = ResumeService(db).bulk_upload_stream(user=user, files=payloads)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
