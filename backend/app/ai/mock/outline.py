"""Chapters from topic shifts.

Every gap between two lines gets a boundary score:

- pause: how much longer than the typical gap it is (log scale), because
  people pause when they change subject;
- drift: how different the vocabulary of the three lines before and after is;
- speaker change: a small nudge, since a new topic is often introduced by
  someone new.

The highest-scoring gaps become chapter starts (3-6 chapters, never too close
together), and each chapter is titled by the term most distinctive of it
compared with the other chapters.
"""

import math
import statistics
from collections import Counter
from dataclasses import dataclass

from app.ai.mock.keywords import terms, tfidf
from app.ai.mock.text_utils import content_words, fmt_ms, speaker_name_tokens, words
from app.ai.types import TranscriptForAI, TranscriptLine

MIN_CHAPTERS = 3
MAX_CHAPTERS = 6
_LINES_PER_CHAPTER = 6
_WINDOW = 3
_SPEAKER_CHANGE_BONUS = 0.25


@dataclass(frozen=True)
class Chapter:
    title: str
    start_ms: int
    lines: list[TranscriptLine]


def _boundary_scores(lines: list[TranscriptLine], exclude: frozenset[str]) -> list[float]:
    gaps = [b.start_ms - a.start_ms for a, b in zip(lines, lines[1:], strict=False)]
    typical = max(statistics.median(gaps), 1.0) if gaps else 1.0
    bags = [set(content_words(line.text, exclude)) for line in lines]
    scores = [0.0]  # line 0 always starts the first chapter
    for i in range(1, len(lines)):
        pause = max(0.0, math.log2(max(gaps[i - 1], 1) / typical))
        before = set().union(*bags[max(0, i - _WINDOW) : i])
        after = set().union(*bags[i : i + _WINDOW])
        union = before | after
        drift = 1 - len(before & after) / len(union) if union else 0.0
        turn = _SPEAKER_CHANGE_BONUS if lines[i].speaker != lines[i - 1].speaker else 0.0
        scores.append(pause + drift + turn)
    return scores


def _chapter_starts(lines: list[TranscriptLine], exclude: frozenset[str]) -> list[int]:
    n = len(lines)
    distinct_starts = len({line.start_ms for line in lines})
    target = min(max(MIN_CHAPTERS, round(n / _LINES_PER_CHAPTER)), MAX_CHAPTERS, distinct_starts)
    min_len = max(1, n // (target * 2))
    scores = _boundary_scores(lines, exclude)
    # Beyond the minimum, a chapter must be earned by a clearly unusual gap
    # (one standard deviation above the mean), not just fill a quota.
    gaps = scores[1:]
    strong = statistics.fmean(gaps) + statistics.pstdev(gaps) if gaps else 0.0
    # Highest score first; index as tie-break keeps the choice deterministic.
    candidates = sorted(range(1, n), key=lambda i: (-scores[i], i))
    starts = [0]
    for i in candidates:
        if len(starts) == target:
            break
        if len(starts) >= MIN_CHAPTERS and scores[i] < strong:
            break
        if n - i < min_len or any(abs(i - s) < min_len for s in starts):
            continue
        # Chapters seek the player, so two starting at the same instant is useless.
        if any(lines[i].start_ms == lines[s].start_ms for s in starts):
            continue
        starts.append(i)
    return sorted(starts)


def _titles(groups: list[list[TranscriptLine]], exclude: frozenset[str]) -> list[str]:
    texts = [" ".join(" ".join(words(line.text)) for line in group) for group in groups]
    docs = [terms(text, exclude) for text in texts]
    df: Counter[str] = Counter(term for doc in docs for term in set(doc))
    titles: list[str] = []
    for doc, text, group in zip(docs, texts, groups, strict=True):
        scores = tfidf(Counter(doc), df, len(docs))
        # Ties go to the term mentioned first: that is usually how a topic is
        # introduced. (A bigram absent verbatim, e.g. across a stopword, sorts last.)
        first_seen = {term: text.find(term) % (len(text) + 1) for term in scores}
        ranked = sorted(scores.items(), key=lambda kv: (-kv[1], first_seen[kv[0]], kv[0]))
        options = [term.title() for term, _ in ranked if term.title() not in titles]
        titles.append(options[0] if options else f"Discussion at {fmt_ms(group[0].start_ms)}")
    return titles


def build_chapters(t: TranscriptForAI) -> list[Chapter]:
    lines = sorted(t.lines, key=lambda line: (line.start_ms, line.segment_id))
    if not lines:
        return []
    exclude = speaker_name_tokens(t)
    starts = _chapter_starts(lines, exclude)
    bounds = list(zip(starts, [*starts[1:], len(lines)], strict=True))
    groups = [lines[a:b] for a, b in bounds]
    titles = _titles(groups, exclude)
    return [
        Chapter(title=title, start_ms=group[0].start_ms, lines=group)
        for title, group in zip(titles, groups, strict=True)
    ]
