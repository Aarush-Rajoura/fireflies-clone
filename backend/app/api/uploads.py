"""Reading an upload without trusting its size."""

from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request, Response, UploadFile
from fastapi.routing import APIRoute

from app.core.config import BYTES_PER_MB
from app.core.exceptions import ValidationFailedError


def read_text_upload(file: UploadFile, max_mb: int) -> str:
    # One byte past the limit proves "too large" without buffering the whole upload.
    raw = file.file.read(max_mb * BYTES_PER_MB + 1)
    if len(raw) > max_mb * BYTES_PER_MB:
        raise _too_large(max_mb)
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValidationFailedError(
            "Transcript must be UTF-8 text", code="UPLOAD_NOT_UTF8"
        ) from exc


# Multipart framing (boundaries, part headers) adds a little to Content-Length.
_FRAMING_SLACK = 64 * 1024


class BoundedUploadRoute(APIRoute):
    """Rejects on the declared Content-Length before FastAPI parses (and spools) the body.

    The header can be absent or wrong, so `read_text_upload` still bounds the actual bytes.
    """

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        handle = super().get_route_handler()

        async def guarded(request: Request) -> Response:
            max_mb = request.app.state.settings.max_upload_mb
            declared = request.headers.get("content-length", "")
            if declared.isdigit() and int(declared) > max_mb * BYTES_PER_MB + _FRAMING_SLACK:
                raise _too_large(max_mb)
            return await handle(request)

        return guarded


def _too_large(max_mb: int) -> ValidationFailedError:
    return ValidationFailedError(
        f"Transcript is larger than {max_mb} MB",
        code="UPLOAD_TOO_LARGE",
        details={"max_mb": max_mb},
    )
