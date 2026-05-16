"""Probe what's actually crashing the streaming search."""
from __future__ import annotations

import asyncio
import logging
import traceback

logging.basicConfig(level=logging.INFO)

import app.models  # noqa
from app.core.database import AsyncSessionLocal
from app.modules.search.service import SearchService


async def run() -> None:
    async with AsyncSessionLocal() as db:
        svc = SearchService(db)
        try:
            async for line in svc.stream("backend dev with Java", limit=3, user_id=None):
                print(line, end="")
        except Exception:
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run())
