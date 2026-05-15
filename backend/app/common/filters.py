import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import AppError, UpstreamAIError

logger = logging.getLogger("skillshub")


def _error_payload(status_code: int, message: str, path: str, details=None) -> dict:
    body = {
        "success": False,
        "statusCode": status_code,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "path": path,
    }
    if details is not None:
        body["details"] = details
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.status_code, exc.message, request.url.path, exc.details),
        )

    @app.exception_handler(HTTPException)
    async def http_exc_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.status_code, str(exc.detail), request.url.path),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=_error_payload(
                422,
                "Request validation failed",
                request.url.path,
                details=exc.errors(),
            ),
        )

    @app.exception_handler(IntegrityError)
    async def integrity_handler(request: Request, exc: IntegrityError):
        logger.warning("integrity_error path=%s err=%s", request.url.path, str(exc.orig))
        return JSONResponse(
            status_code=409,
            content=_error_payload(409, "Database constraint violated", request.url.path),
        )

    @app.exception_handler(UpstreamAIError)
    async def upstream_ai_handler(request: Request, exc: UpstreamAIError):
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.status_code, exc.message, request.url.path),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        rid = getattr(request.state, "request_id", "-")
        logger.exception("unhandled rid=%s path=%s", rid, request.url.path)
        return JSONResponse(
            status_code=500,
            content=_error_payload(500, "Internal server error", request.url.path),
        )
