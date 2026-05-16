from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.common.decorators import require_admin
from app.common.dependencies import CurrentUser, DbSession
from app.modules.ai.schemas import TeamBuildResult
from app.modules.search.schemas import (
    JDSearchRequest,
    RecentSearchItem,
    SavedSearchCreate,
    SavedSearchResponse,
    SearchRequest,
    SearchResult,
    TeamBuildRequest,
)
from app.modules.search.service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])


@router.post(
    "",
    summary="Natural-language search over employees (HR only, SSE stream)",
    description=(
        "Streams ranked candidates as Server-Sent Events. Each event has type "
        "`result` and a JSON payload with employee_id, match_score, reason, "
        "matched_skill_names, and evidence_snippets. Stream ends with an event "
        "of type `done`."
    ),
    response_class=StreamingResponse,
)
async def search_stream(
    payload: SearchRequest,
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> StreamingResponse:
    generator = SearchService(db).stream(payload.query, payload.limit, user.id)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post(
    "/jd",
    summary="Paste a job description, get a ranked shortlist (HR only, SSE stream)",
    description=(
        "Two-stage SSE: first emits `event: query` with the distilled hiring "
        "query the AI generated from the JD, then streams `event: result` "
        "events per candidate using the same ranker as POST /search."
    ),
    response_class=StreamingResponse,
)
async def search_from_jd(
    payload: JDSearchRequest,
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> StreamingResponse:
    generator = SearchService(db).stream_from_jd(
        payload.job_description, payload.limit, user.id
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post(
    "/sync",
    response_model=list[SearchResult],
    summary="Non-streaming search variant (useful for debugging / scripts)",
)
async def search_sync(
    payload: SearchRequest,
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> list[SearchResult]:
    return await SearchService(db).rank_non_streaming(payload.query, payload.limit)


@router.post(
    "/team",
    response_model=TeamBuildResult,
    summary="Team builder: assemble a small team for a brief (stretch goal)",
)
async def build_team(
    payload: TeamBuildRequest,
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> TeamBuildResult:
    return await SearchService(db).build_team(payload.brief, payload.team_size)


@router.get(
    "/history",
    response_model=list[RecentSearchItem],
    summary="Current user's recent search queries (deduped, HR only)",
)
async def search_history(
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> list[RecentSearchItem]:
    return await SearchService(db).list_recent(user.id, limit=10)


@router.get(
    "/saved",
    response_model=list[SavedSearchResponse],
    summary="Current user's saved searches (HR only)",
)
async def list_saved(
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> list[SavedSearchResponse]:
    rows = await SearchService(db).list_saved(user.id)
    return [SavedSearchResponse.model_validate(r) for r in rows]


@router.post(
    "/saved",
    response_model=SavedSearchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a search query (HR only). Idempotent on (user, query_text).",
)
async def create_saved(
    payload: SavedSearchCreate,
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> SavedSearchResponse:
    row = await SearchService(db).create_saved(
        user.id, payload.query_text, payload.label
    )
    return SavedSearchResponse.model_validate(row)


@router.delete(
    "/saved/{saved_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved search (HR only, must own it)",
)
async def delete_saved(
    saved_id: UUID,
    user: CurrentUser,
    db: DbSession,
    _admin=Depends(require_admin),
) -> None:
    await SearchService(db).delete_saved(user.id, saved_id)
