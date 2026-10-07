"""Plain, frozen input/output types shared by every AI provider."""

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


@dataclass(frozen=True)
class OutlineEntry:
    title: str
    start_ms: int


@dataclass(frozen=True)
class NoteGroup:
    title: str
    bullets: list[str]


@dataclass(frozen=True)
class KeywordResult:
    term: str
    weight: float


@dataclass(frozen=True)
class SummaryResult:
    overview: str
    outline: list[OutlineEntry]
    notes: list[NoteGroup]
    keywords: list[KeywordResult]


@dataclass(frozen=True)
class ActionItemDraft:
    text: str
    assignee: str | None
    start_ms: int | None


@dataclass(frozen=True)
class Citation:
    segment_id: int
    start_ms: int
    quote: str


@dataclass(frozen=True)
class Answer:
    text: str
    citations: list[Citation]


@dataclass(frozen=True)
class Passage:
    """One retrievable piece of meeting content: a transcript line, or a summary
    (no segment) when answering across meetings."""

    meeting_id: int
    meeting_title: str
    segment_id: int | None
    start_ms: int | None
    speaker: str | None
    text: str
