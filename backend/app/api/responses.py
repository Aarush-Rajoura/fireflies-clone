"""Shared `responses=` declarations.

Exception handlers return JSON directly, so FastAPI would never see the error
envelope. Declaring it per route puts `ErrorResponse` into the OpenAPI schema,
which is what lets the generated client type failures.
"""

from typing import Any

from app.schemas.common import ErrorResponse

Responses = dict[int | str, dict[str, Any]]


def _declare(status: int, description: str) -> Responses:
    return {status: {"model": ErrorResponse, "description": description}}


NOT_FOUND = _declare(404, "The resource does not exist.")
GONE = _declare(410, "The meeting was soft-deleted; restore it to use it again.")
VALIDATION = _declare(422, "Invalid input; `details.errors[].loc` is the field path.")
CONFLICT = _declare(409, "The request conflicts with current state, e.g. a duplicate name.")
SERVICE_UNAVAILABLE = _declare(503, "A dependency is unavailable, e.g. the database is unseeded.")
RATE_LIMITED = _declare(429, "AI rate limit exceeded; retry later.")
