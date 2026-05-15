from typing import Any


class AppError(Exception):
    status_code: int = 500
    default_message: str = "Internal server error"

    def __init__(self, message: str | None = None, *, details: Any = None) -> None:
        self.message = message or self.default_message
        self.details = details
        super().__init__(self.message)


class BadRequestError(AppError):
    status_code = 400
    default_message = "Bad request"


class UnauthorizedError(AppError):
    status_code = 401
    default_message = "Unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    default_message = "Forbidden"


class NotFoundError(AppError):
    status_code = 404
    default_message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    default_message = "Conflict"


class UnprocessableError(AppError):
    status_code = 422
    default_message = "Unprocessable entity"


class UpstreamAIError(AppError):
    status_code = 502
    default_message = "AI service is temporarily unavailable"
