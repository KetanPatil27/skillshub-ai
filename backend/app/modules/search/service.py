import json
import logging
from typing import AsyncIterator
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai import service as ai_service
from app.modules.ai.schemas import SearchResult, TeamBuildResult
from app.modules.employees.service import EmployeeService
from app.modules.search.models import SearchQueryLog

logger = logging.getLogger("skillshub.search")


class SearchService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _candidates(self) -> list[dict]:
        rows = await EmployeeService(self.db).list_approved_candidates()
        return [EmployeeService.to_search_candidate(r) for r in rows]

    async def stream(
        self, query: str, limit: int, user_id: UUID | None
    ) -> AsyncIterator[str]:
        """Yields SSE-formatted lines. Each `data:` line is one search result JSON.

        Final event: `data: {"done": true, "count": N}`
        """
        candidates = await self._candidates()
        if not candidates:
            yield "event: done\n"
            yield 'data: {"done": true, "count": 0, "message": "No approved profiles to search."}\n\n'
            return

        count = 0
        top_score: int | None = None
        try:
            async for result in ai_service.stream_search_results(query, candidates, limit):
                count += 1
                if top_score is None or result.match_score > top_score:
                    top_score = result.match_score
                payload = result.model_dump()
                yield f"event: result\ndata: {json.dumps(payload)}\n\n"
        except Exception:
            logger.exception("search stream failed mid-flight")
            yield 'event: error\ndata: {"message":"Search failed mid-stream"}\n\n'

        self.db.add(
            SearchQueryLog(
                user_id=user_id,
                query_text=query,
                result_count=count,
                top_match_score=top_score,
            )
        )
        await self.db.commit()

        yield f'event: done\ndata: {{"done": true, "count": {count}}}\n\n'

    async def stream_from_jd(
        self, job_description: str, limit: int, user_id: UUID | None
    ) -> AsyncIterator[str]:
        """Two-stage SSE:
        1. Distill the JD into a hiring query (1 fast Gemini call).
           Emit `event: query` carrying {"generated_query": "..."}.
        2. Forward into the existing ranker and stream `event: result` per candidate.
        """
        try:
            generated_query = await ai_service.distill_jd_to_query(job_description)
        except Exception:
            logger.exception("JD distillation failed")
            yield 'event: error\ndata: {"message":"Could not summarise the job description."}\n\n'
            yield 'event: done\ndata: {"done": true, "count": 0}\n\n'
            return

        yield f"event: query\ndata: {json.dumps({'generated_query': generated_query})}\n\n"

        async for line in self.stream(generated_query, limit, user_id):
            yield line

    async def rank_non_streaming(self, query: str, limit: int) -> list[SearchResult]:
        candidates = await self._candidates()
        return await ai_service.rank_candidates_non_streaming(query, candidates, limit)

    async def build_team(self, brief: str, team_size: int) -> TeamBuildResult:
        candidates = await self._candidates()
        return await ai_service.build_team(brief, candidates, team_size)
