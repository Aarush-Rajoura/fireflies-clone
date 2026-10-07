"""Data shapes the AI layer speaks; no ORM objects or API schemas cross this boundary."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptLine:
    segment_id: int
    speaker: str
    start_ms: int
    text: str


@dataclass(frozen=True)
class TranscriptForAI:
    meeting_title: str
    lines: list[TranscriptLine]
