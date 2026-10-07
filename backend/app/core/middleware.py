"""Request context: X-Request-ID in/out and one access-log line per request."""

import logging
import re
import time
import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.errors import internal_error_response

logger = logging.getLogger("app.request")
HEADER = "X-Request-ID"
# Inbound ids are echoed into logs and headers, so only a safe, bounded form is trusted.
_VALID_ID = re.compile(r"[A-Za-z0-9._-]{1,128}")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        inbound = request.headers.get(HEADER, "")
        request_id = inbound if _VALID_ID.fullmatch(inbound) else uuid.uuid4().hex
        request.state.request_id = request_id
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            # Handled here, not by Starlette's outer error layer, so the 500 still
            # passes through this middleware and carries the request id header.
            logger.exception("unhandled error request_id=%s", request_id)
            response = internal_error_response(request_id)
        response.headers[HEADER] = request_id
        logger.info(
            "%s %s -> %d %.1fms id=%s",
            request.method,
            request.url.path,
            response.status_code,
            (time.perf_counter() - start) * 1000,
            request_id,
        )
        return response
