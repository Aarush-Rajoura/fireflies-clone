"""Domain types shared by every transcript parser."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ParsedSegment:
    speaker: str
    start_ms: int
    end_ms: int
    text: str


@dataclass(frozen=True)
class ParsedTranscript:
    segments: list[ParsedSegment]
    format: str  # "vtt" | "srt" | "json" | "text"
    timings_estimated: bool
    warnings: list[str]


class TranscriptParser(Protocol):
    format: str

    def can_parse(self, filename: str | None, content: str) -> bool:
        """Cheap check by extension or content sniffing; must not raise."""
        ...

    def parse(self, content: str) -> ParsedTranscript:
        """Raise ValidationFailedError(TRANSCRIPT_UNRECOGNISED) if content does not fit."""
        ...


def extension_of(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()
