"""Chunking and merging of Gemini summaries.

Long transcripts are split into consecutive chunks that are summarised
independently, then merged locally: overviews joined and trimmed, chapters
snapped to real lines and down-sampled, notes regrouped under the chapters
that survive, keywords merged by best weight. A second "merge" LLM call would
read better but doubles cost and latency.

Model output is not trusted for positions: a chapter's `start_ms` is snapped
to the latest real line at or before it, and a chapter that does not move
forward in time after snapping is folded into the previous one.
"""

import bisect
import re
from dataclasses import dataclass

from app.ai.types import KeywordResult, NoteGroup, OutlineEntry, TranscriptLine

MAX_KEYWORDS = 6
MAX_CHAPTERS = 6
MAX_OVERVIEW_SENTENCES = 5


@dataclass(frozen=True)
class ChunkSummary:
    """One chunk's validated output, in plain types."""

    overview: str
    outline: list[OutlineEntry]
    notes: list[NoteGroup]
    keywords: list[KeywordResult]


@dataclass
class _Chapter:
    title: str
    start_ms: int
    bullets: list[str]


def chunk_lines(lines: list[TranscriptLine], max_words: int) -> list[list[TranscriptLine]]:
    """Consecutive line groups of at most ~max_words words (a line is never split)."""
    chunks: list[list[TranscriptLine]] = [[]]
    size = 0
    for line in lines:
        n = len(line.text.split())
        if chunks[-1] and size + n > max_words:
            chunks.append([])
            size = 0
        chunks[-1].append(line)
        size += n
    return [c for c in chunks if c]


def _chunk_chapters(part: ChunkSummary) -> list[_Chapter]:
    """Pair each chapter with its notes (by title, else by position)."""
    by_title = {n.title.strip().lower(): n for n in part.notes}
    chapters: list[_Chapter] = []
    used: set[int] = set()
    for i, entry in enumerate(part.outline):
        note = by_title.get(entry.title.strip().lower())
        if note is None and i < len(part.notes) and i not in used:
            note = part.notes[i]
        if note is not None:
            used.add(part.notes.index(note))
        chapters.append(
            _Chapter(entry.title.strip(), entry.start_ms, list(note.bullets) if note else [])
        )
    # Notes that matched no chapter still belong to this chunk's last chapter.
    leftovers = [b for j, n in enumerate(part.notes) if j not in used for b in n.bullets]
    if chapters:
        chapters[-1].bullets.extend(leftovers)
    return chapters


def _keep_evenly(n: int, k: int) -> list[int]:
    if n <= k:
        return list(range(n))
    step = (n - 1) / (k - 1)
    return sorted({round(i * step) for i in range(k)})


def merge_chapters(
    parts: list[ChunkSummary], starts: list[int]
) -> tuple[list[OutlineEntry], list[NoteGroup]]:
    """Snap, de-duplicate and down-sample chapters; each note group follows its chapter."""
    snapped: list[_Chapter] = []
    for chapter in (c for part in parts for c in _chunk_chapters(part)):
        i = bisect.bisect_right(starts, chapter.start_ms) - 1
        chapter.start_ms = starts[max(i, 0)]
        if snapped and chapter.start_ms <= snapped[-1].start_ms:
            snapped[-1].bullets.extend(chapter.bullets)
            continue
        snapped.append(chapter)
    kept: list[_Chapter] = []
    keep = set(_keep_evenly(len(snapped), MAX_CHAPTERS))
    for i, chapter in enumerate(snapped):
        if i in keep or not kept:
            kept.append(chapter)
        else:  # dropped chapter: its notes join the chapter it now belongs to
            kept[-1].bullets.extend(chapter.bullets)
    outline = [OutlineEntry(c.title, c.start_ms) for c in kept]
    notes = [NoteGroup(c.title, c.bullets) for c in kept if c.bullets]
    return outline, notes


def merge_keywords(keywords: list[KeywordResult]) -> list[KeywordResult]:
    best: dict[str, float] = {}
    for k in keywords:
        term = k.term.strip().lower()
        if term:
            best[term] = max(best.get(term, 0.0), min(max(k.weight, 0.01), 1.0))
    ranked = sorted(best.items(), key=lambda kv: (-kv[1], kv[0]))[:MAX_KEYWORDS]
    return [KeywordResult(term=t, weight=round(w, 3)) for t, w in ranked]


def merge_overviews(overviews: list[str]) -> str:
    text = " ".join(o.strip() for o in overviews)
    parts = [s for s in re.split(r"(?<=[.!?])\s+", text) if s]
    return " ".join(parts[:MAX_OVERVIEW_SENTENCES])
