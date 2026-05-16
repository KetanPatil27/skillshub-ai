import json
import logging
from datetime import date, timedelta
from typing import AsyncIterator
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.ai import service as ai_service
from app.modules.ai.schemas import SearchResult, TeamBuildResult
from app.modules.employees.service import EmployeeService
from app.modules.search.models import SavedSearch, SearchQueryLog
from app.modules.search.schemas import RecentSearchItem

logger = logging.getLogger("skillshub.search")


def _temporal_context(today: date) -> dict[str, str]:
    return {
        "today": today.isoformat(),
        "last_month_start": (today - timedelta(days=30)).isoformat(),
        "last_quarter_start": (today - timedelta(days=90)).isoformat(),
    }


def _augment_with_recency(candidates: list[dict], today: date) -> list[dict]:
    """Adds `days_since_last_project_end` (int or None) to each candidate in place."""
    for c in candidates:
        end_iso = c.get("last_project_end_date")
        days: int | None = None
        if end_iso:
            try:
                days = (today - date.fromisoformat(end_iso)).days
            except ValueError:
                days = None
        c["days_since_last_project_end"] = days
    return candidates


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
        today = date.today()
        candidates = _augment_with_recency(await self._candidates(), today)
        if not candidates:
            yield "event: done\n"
            yield 'data: {"done": true, "count": 0, "message": "No approved profiles to search."}\n\n'
            return

        temporal_context = _temporal_context(today)

        count = 0
        top_score: int | None = None
        try:
            async for result in ai_service.stream_search_results(
                query, candidates, limit, temporal_context
            ):
                count += 1
                if top_score is None or result.match_score > top_score:
                    top_score = result.match_score
                payload = result.model_dump()
                yield f"event: result\ndata: {json.dumps(payload)}\n\n"
        except Exception as exc:
            logger.exception("search stream failed mid-flight")
            msg = str(exc) or "Search failed mid-stream"
            yield f"event: error\ndata: {json.dumps({'message': msg})}\n\n"

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
        except Exception as exc:
            logger.exception("JD distillation failed")
            msg = str(exc) or "Could not summarise the job description."
            yield f"event: error\ndata: {json.dumps({'message': msg})}\n\n"
            yield 'event: done\ndata: {"done": true, "count": 0}\n\n'
            return

        yield f"event: query\ndata: {json.dumps({'generated_query': generated_query})}\n\n"

        async for line in self.stream(generated_query, limit, user_id):
            yield line

    async def rank_non_streaming(self, query: str, limit: int) -> list[SearchResult]:
        today = date.today()
        candidates = _augment_with_recency(await self._candidates(), today)
        return await ai_service.rank_candidates_non_streaming(
            query, candidates, limit, _temporal_context(today)
        )

    async def build_team(self, brief: str, team_size: int) -> TeamBuildResult:
        candidates = await self._candidates()
        return await ai_service.build_team(brief, candidates, team_size)

    # ── Search history & saved searches ──────────────────────────────

    async def list_recent(self, user_id: UUID, limit: int = 10) -> list[RecentSearchItem]:
        """Deduped list of this user's most recent search queries.

        Group by query_text so a user that ran the same search 3 times sees
        one row with use_count=3 rather than three identical rows.
        """
        stmt = (
            select(
                SearchQueryLog.query_text,
                func.max(SearchQueryLog.created_at).label("last_used_at"),
                func.count(SearchQueryLog.id).label("use_count"),
            )
            .where(SearchQueryLog.user_id == user_id)
            .group_by(SearchQueryLog.query_text)
            .order_by(desc("last_used_at"))
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            RecentSearchItem(
                query_text=q,
                last_used_at=last,
                use_count=int(count),
            )
            for q, last, count in rows
        ]

    async def list_saved(self, user_id: UUID) -> list[SavedSearch]:
        stmt = (
            select(SavedSearch)
            .where(SavedSearch.user_id == user_id)
            .order_by(SavedSearch.created_at.desc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def create_saved(
        self, user_id: UUID, query_text: str, label: str | None
    ) -> SavedSearch:
        """Idempotent: saving the same query twice returns the existing row."""
        row = SavedSearch(
            user_id=user_id, query_text=query_text.strip(), label=label
        )
        self.db.add(row)
        try:
            await self.db.commit()
            await self.db.refresh(row)
            return row
        except IntegrityError:
            await self.db.rollback()
            stmt = (
                select(SavedSearch)
                .where(SavedSearch.user_id == user_id)
                .where(SavedSearch.query_text == query_text.strip())
            )
            existing = (await self.db.execute(stmt)).scalar_one_or_none()
            if existing is None:
                raise
            # Update the label if the caller provided a new one.
            if label is not None and existing.label != label:
                existing.label = label
                await self.db.commit()
                await self.db.refresh(existing)
            return existing

    async def delete_saved(self, user_id: UUID, saved_id: UUID) -> None:
        row = await self.db.get(SavedSearch, saved_id)
        if row is None or row.user_id != user_id:
            raise NotFoundError("Saved search not found")
        await self.db.delete(row)
        await self.db.commit()
