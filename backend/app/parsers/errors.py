"""Parser errors: ValidationFailedError subclasses so the HTTP mapping still applies (422)."""

from app.core.exceptions import ValidationFailedError


class TranscriptEmptyError(ValidationFailedError):
    code = "TRANSCRIPT_EMPTY"
    default_message = "The transcript is empty"


class TranscriptUnrecognisedError(ValidationFailedError):
    code = "TRANSCRIPT_UNRECOGNISED"
    default_message = "The transcript format was not recognised"
