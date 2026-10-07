"""Pure helpers for meeting creation: name resolution, AI input, timing and previews."""

import bisect
import dataclasses
import zlib
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from app.ai.types import ActionItemDraft, SummaryResult, TranscriptForAI, TranscriptLine
from app.parsers import ParsedTranscript
from app.schemas.transcript import SegmentIn, TranscriptPreview

SPEAKER_COLOURS = 8
SPEAKER_MAX = 100
LINE_MAX = 5000


@dataclass(frozen=True)
class AIOutput:
    summary: SummaryResult
    drafts: list[ActionItemDraft]


def color_index(label: str) -> int:
    # crc32, not hash(): Python's str hash is salted per process, colours must not be.
    return zlib.crc32(label.encode("utf-8")) % SPEAKER_COLOURS


def distinct(names: Iterable[str]) -> list[str]:
    """First spelling of each name wins; comparison ignores case."""
    seen: dict[str, str] = {}
    for name in names:
        seen.setdefault(name.lower(), name)
    return list(seen.values())


def resolve_speaker_names(participants: Sequence[str], labels: Sequence[str]) -> dict[str, str]:
    """Map each speaker label to the participant name it becomes (existing or new)."""
    known = {n.lower(): n for n in participants}
    out: dict[str, str] = {}
    for label in labels:
        out[label] = known.setdefault(label.lower(), label)
    return out


def ai_transcript(
    title: str, segments: Sequence[SegmentIn], names: dict[str, str]
) -> TranscriptForAI:
    # No rows exist yet, so the sequence number stands in for the segment id.
    return TranscriptForAI(
        meeting_title=title,
        lines=[
            TranscriptLine(segment_id=i, speaker=names[s.speaker], start_ms=s.start_ms, text=s.text)
            for i, s in enumerate(segments)
        ],
    )


def snap(start_ms: int | None, starts: Sequence[int]) -> int | None:
    """Move a position to the start of the line containing it, so clicks land on a line."""
    if start_ms is None or not starts:
        return start_ms
    return starts[max(bisect.bisect_right(starts, start_ms) - 1, 0)]


def snap_summary(result: SummaryResult, starts: Sequence[int]) -> SummaryResult:
    outline = [
        dataclasses.replace(e, start_ms=snap(e.start_ms, starts) or 0) for e in result.outline
    ]
    return dataclasses.replace(result, outline=outline)


def talk_ms_by_name(segments: Sequence[SegmentIn], names: dict[str, str]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for s in segments:
        key = names[s.speaker].lower()
        totals[key] = totals.get(key, 0) + max(s.end_ms - s.start_ms, 0)
    return totals


def preview(parsed: ParsedTranscript) -> TranscriptPreview:
    segments = [
        SegmentIn(
            speaker=p.speaker.strip()[:SPEAKER_MAX] or "Speaker",
            start_ms=max(p.start_ms, 0),
            end_ms=max(p.end_ms, p.start_ms, 0),
            text=p.text.strip()[:LINE_MAX],
        )
        for p in parsed.segments
        if p.text.strip()
    ]
    return TranscriptPreview(
        format=parsed.format,
        timings_estimated=parsed.timings_estimated,
        speakers=list(dict.fromkeys(s.speaker for s in segments)),
        segment_count=len(segments),
        duration_ms=max((s.end_ms for s in segments), default=0),
        warnings=parsed.warnings,
        segments=segments,
    )
