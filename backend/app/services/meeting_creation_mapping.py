"""Pure helpers for meeting creation: name resolution, AI input, talk time and previews."""

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


def talk_ms_by_name(segments: Sequence[SegmentIn], names: dict[str, str]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for s in segments:
        key = names[s.speaker].lower()
        totals[key] = totals.get(key, 0) + max(s.end_ms - s.start_ms, 0)
    return totals


def split_long_text(text: str, limit: int = LINE_MAX) -> list[str]:
    """Chunks of at most `limit` characters, broken between words where possible."""
    chunks: list[str] = []
    current = ""
    for word in text.split():
        while len(word) > limit:  # one unbroken "word" longer than a line: hard cut
            if current:
                chunks.append(current)
                current = ""
            chunks.append(word[:limit])
            word = word[limit:]
        if not word:
            continue
        if current and len(current) + 1 + len(word) > limit:
            chunks.append(current)
            current = word
        else:
            current = f"{current} {word}" if current else word
    if current:
        chunks.append(current)
    return chunks


def _split_segment(speaker: str, start: int, end: int, text: str) -> list[SegmentIn]:
    """One segment, or several consecutive ones sharing its time span by text length.

    Nothing is truncated: a line over LINE_MAX becomes several lines, and their timings
    are the original span divided in proportion to the text each one keeps.
    """
    chunks = split_long_text(text)
    total = sum(len(c) for c in chunks)
    out: list[SegmentIn] = []
    cursor, consumed = start, 0
    for i, chunk in enumerate(chunks):
        consumed += len(chunk)
        chunk_end = end if i == len(chunks) - 1 else start + (end - start) * consumed // total
        out.append(SegmentIn(speaker=speaker, start_ms=cursor, end_ms=chunk_end, text=chunk))
        cursor = chunk_end
    return out


def preview(parsed: ParsedTranscript) -> TranscriptPreview:
    segments: list[SegmentIn] = []
    split = 0
    for p in parsed.segments:
        text = p.text.strip()
        if not text:
            continue
        start = max(p.start_ms, 0)
        parts = _split_segment(
            p.speaker.strip()[:SPEAKER_MAX] or "Speaker", start, max(p.end_ms, start), text
        )
        split += len(parts) > 1
        segments.extend(parts)
    warnings = list(parsed.warnings)
    if split:
        warnings.append(
            f"{split} {'line' if split == 1 else 'lines'} over {LINE_MAX} characters split"
        )
    return TranscriptPreview(
        format=parsed.format,
        timings_estimated=parsed.timings_estimated,
        speakers=list(dict.fromkeys(s.speaker for s in segments)),
        segment_count=len(segments),
        duration_ms=max((s.end_ms for s in segments), default=0),
        warnings=warnings,
        segments=segments,
    )
