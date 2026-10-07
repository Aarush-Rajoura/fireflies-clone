"""Maps domain, HTTP and validation errors onto the `{error: {...}}` envelope."""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.ai.interfaces import ProviderError
from app.core.exceptions import (
    AppError,
    ConflictError,
    GoneError,
    NotFoundError,
    ServiceUnavailableError,
    ValidationFailedError,
)
from app.schemas.common import ErrorDetail, ErrorResponse

logger = logging.getLogger("app.errors")

# The single place that knows which HTTP status each domain error means.
STATUS_BY_ERROR: dict[type[AppError], int] = {
    NotFoundError: 404,
    GoneError: 410,
    ValidationFailedError: 422,
    ConflictError: 409,
    ServiceUnavailableError: 503,
}

_CODE_BY_STATUS = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    410: "GONE",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    503: "SERVICE_UNAVAILABLE",
}


def error_response(
    status: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message, details=details or {}))
    return JSONResponse(body.model_dump(), status_code=status, headers=headers)


def internal_error_response(request_id: str) -> JSONResponse:
    # Generic message on purpose: internals stay in the logs, keyed by request id.
    return error_response(
        500, "INTERNAL_ERROR", "Internal server error", {"request_id": request_id}
    )


def _request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", ""))


async def _app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    status = next((s for t, s in STATUS_BY_ERROR.items() if isinstance(exc, t)), 400)
    return error_response(status, exc.code, exc.message, exc.details)


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _CODE_BY_STATUS.get(exc.status_code, "HTTP_ERROR")
    headers = dict(exc.headers) if exc.headers else None
    return error_response(exc.status_code, code, str(exc.detail), headers=headers)


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = [
        {"loc": [str(p) for p in e["loc"]], "msg": e["msg"], "type": e["type"]}
        for e in exc.errors()
    ]
    return error_response(422, "VALIDATION_ERROR", "Request validation failed", {"errors": errors})


async def _provider_error(_: Request, exc: Exception) -> JSONResponse:
    # A bare provider (no fallback wrapper) failing is an outage of a dependency, not our bug.
    logger.warning("ai provider failed: %s", exc)
    return error_response(503, "AI_UNAVAILABLE", "The AI provider is unavailable")


async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id(request)
    logger.error("unhandled error request_id=%s", request_id, exc_info=exc)
    return internal_error_response(request_id)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(ProviderError, _provider_error)
    app.add_exception_handler(Exception, _unhandled)
