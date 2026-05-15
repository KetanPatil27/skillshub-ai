from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.common.decorators import require_admin
from app.common.dependencies import CurrentUser, DbSession
from app.modules.ai.schemas import TeamBuildResult
from app.modules.search.schemas import SearchRequest, SearchResult, TeamBuildRequest
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
