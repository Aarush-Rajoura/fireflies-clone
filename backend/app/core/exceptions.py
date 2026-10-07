"""Domain exceptions. They carry no HTTP knowledge; core/errors.py maps them to statuses."""

from typing import Any


class AppError(Exception):
    code: str = "APP_ERROR"
    default_message: str = "Application error"

    def __init__(
        self,
        message: str | None = None,
        *,
        details: dict[str, Any] | None = None,
        code: str | None = None,
    ):
        if code is not None:
            self.code = code  # instance override of the class default
        self.message = message or self.default_message
        self.details: dict[str, Any] = details or {}
        super().__init__(self.message)


class NotFoundError(AppError):
    code = "NOT_FOUND"
    default_message = "Resource not found"


class GoneError(AppError):
    code = "GONE"
    default_message = "Resource has been deleted"


class ValidationFailedError(AppError):
    code = "VALIDATION_ERROR"
    default_message = "Validation failed"


class ConflictError(AppError):
    code = "CONFLICT"
    default_message = "Conflicting state"


class ServiceUnavailableError(AppError):
    code = "SERVICE_UNAVAILABLE"
    default_message = "Service unavailable"
