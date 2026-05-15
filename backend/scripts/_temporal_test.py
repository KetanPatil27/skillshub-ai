"""Throwaway runner: exercise the temporal search prompt against the seeded DB.

Usage: python -m scripts._temporal_test
"""
from __future__ import annotations

import asyncio
import json
import logging
import traceback

logging.basicConfig(level=logging.INFO)

import app.models  # registers every mapper before we touch the ORM
from app.core.database import AsyncSessionLocal
from app.modules.search.service import SearchService

QUERIES = [
    ("b", "Who's available to start next month?"),
    ("c", "Backend engineers who've shipped something in the last 30 days."),
]


async def run() -> None:
    async with AsyncSessionLocal() as db:
        svc = SearchService(db)
        for tag, q in QUERIES:
            print(f"\n===== QUERY ({tag}) =====")
            print(q)
            try:
                results = await svc.rank_non_streaming(q, 5)
            except Exception as e:
                print(f"ERROR: {e!r}")
                traceback.print_exc()
                continue
            print(json.dumps([r.model_dump() for r in results], indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(run())
