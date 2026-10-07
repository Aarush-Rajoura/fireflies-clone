"""Reading an upload without trusting its size."""

from fastapi import UploadFile

from app.core.exceptions import ValidationFailedError

BYTES_PER_MB = 1024 * 1024


def read_text_upload(file: UploadFile, max_mb: int) -> str:
    # One byte past the limit proves "too large" without buffering the whole upload.
    raw = file.file.read(max_mb * BYTES_PER_MB + 1)
    if len(raw) > max_mb * BYTES_PER_MB:
        raise ValidationFailedError(
            f"Transcript is larger than {max_mb} MB",
            code="UPLOAD_TOO_LARGE",
            details={"max_mb": max_mb},
        )
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValidationFailedError(
            "Transcript must be UTF-8 text", code="UPLOAD_NOT_UTF8"
        ) from exc
