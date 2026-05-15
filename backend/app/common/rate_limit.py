"""Tiny in-memory sliding-window rate limiter for /auth/* endpoints.

Hackathon scope only. For production, swap in slowapi + Redis so the limit
holds across replicas and survives restarts. This implementation keeps
state in a process-local dict, so it resets on every reload and is per
worker, not per cluster.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import AppError

_WINDOW_SECONDS = 60.0


class TooManyRequestsError(AppError):
    status_code = 429
    default_message = "Too many requests. Please slow down and try again."


_buckets: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    # Honour X-Forwarded-For if the app sits behind a proxy.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def auth_rate_limit(request: Request) -> None:
    limit = settings.AUTH_RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return  # disabled

    key = f"{_client_ip(request)}:{request.url.path}"
    now = time.monotonic()
    cutoff = now - _WINDOW_SECONDS

    with _lock:
        bucket = _buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            raise TooManyRequestsError(
                f"Too many requests. Try again in {int(_WINDOW_SECONDS)} seconds."
            )
        bucket.append(now)
