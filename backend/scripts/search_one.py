"""Run a single search query against the seeded data and print ranked results.

Usage:
    python -m scripts.search_one "Find me a backend dev in Pune with 3+ years of Java"
"""

from __future__ import annotations

import asyncio
import json
import sys

from app.core.database import AsyncSessionLocal
from app.modules.search.service import SearchService


async def _run(query: str, limit: int) -> None:
    async with AsyncSessionLocal() as db:
        results = await SearchService(db).rank_non_streaming(query, limit)
    print(json.dumps([r.model_dump() for r in results], indent=2))


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python -m scripts.search_one "<query>" [limit]', file=sys.stderr)
        sys.exit(2)
    query = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    asyncio.run(_run(query, limit))


if __name__ == "__main__":
    main()
