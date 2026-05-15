import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("skillshub")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = rid
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            logger.exception("request_failed rid=%s path=%s elapsed_ms=%s", rid, request.url.path, elapsed_ms)
            raise
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        response.headers["x-request-id"] = rid
        logger.info(
            "request rid=%s method=%s path=%s status=%s elapsed_ms=%s",
            rid,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response
