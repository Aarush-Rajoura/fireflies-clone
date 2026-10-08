"""Chapters from topic shifts.

1. Decide how many chapters the meeting deserves: about one per 10 lines,
   3 to 6, and never shorter than 5 lines when there is room for that.
2. Score every gap between lines: TF-IDF cosine *dissimilarity* of the 6
   lines before vs the 6 after (vocabulary changes when the topic does), plus
   a bonus for an unusually long pause.
3. Place boundaries at the evenly spaced points, each moved to the strongest
   topic shift within half a chapter of it. Strong shifts win; when the scores
   are flat this degrades to a near-even partition instead of piling every
   chapter into one corner of the meeting.
4. Title each chapter with its most distinctive phrase (TF-IDF across
   chapters), preferring a two-word phrase; speaker names are never topics.
"""

import math
import statistics
from collections import Counter
from dataclasses import dataclass

from app.ai.mock.keywords import terms
from app.ai.mock.text_utils import (
    content_words,
    fmt_ms,
    is_content,
    sentences,
    speaker_name_tokens,
    words,
)
from app.ai.types import TranscriptForAI, TranscriptLine

MIN_CHAPTERS = 3
MAX_CHAPTERS = 6
_LINES_PER_CHAPTER = 10
_MIN_CHAPTER_LINES = 5
_WINDOW = 6
_PAUSE_WEIGHT = 0.5
# How much a boundary loses per chapter-length of distance from its even point;
# small, so a clear shift nearby still wins.
_DISTANCE_PENALTY = 0.3


@dataclass(frozen=True)
class Chapter:
    title: str
    start_ms: int
    lines: list[TranscriptLine]


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a[w] * b[w] for w in sorted(a.keys() & b.keys()))
    norm = math.sqrt(sum(v * v for _, v in sorted(a.items())))
    norm *= math.sqrt(sum(v * v for _, v in sorted(b.items())))
    return dot / norm if norm else 0.0


def _boundary_scores(lines: list[TranscriptLine], exclude: frozenset[str]) -> list[float]:
    n = len(lines)
    docs = [Counter(content_words(line.text, exclude)) for line in lines]
    df: Counter[str] = Counter(w for doc in docs for w in doc)
    idf = {w: math.log((n + 1) / (c + 0.5)) + 1 for w, c in df.items()}

    def window(a: int, b: int) -> dict[str, float]:
        total: Counter[str] = Counter()
        for doc in docs[max(a, 0) : b]:
            total.update(doc)
        return {w: c * idf[w] for w, c in total.items()}

    gaps = [b.start_ms - a.start_ms for a, b in zip(lines, lines[1:], strict=False)]
    typical = max(statistics.median(gaps), 1.0) if gaps else 1.0
    scores = [0.0]  # line 0 always starts the first chapter
    for i in range(1, n):
        shift = 1 - _cosine(window(i - _WINDOW, i), window(i, i + _WINDOW))
        pause = max(0.0, min(math.log2(max(gaps[i - 1], 1) / typical), 3.0))
        scores.append(shift + _PAUSE_WEIGHT * pause)
    return scores


def _chapter_starts(lines: list[TranscriptLine], exclude: frozenset[str]) -> list[int]:
    n = len(lines)
    distinct = len({line.start_ms for line in lines})
    target = min(max(MIN_CHAPTERS, n // _LINES_PER_CHAPTER), MAX_CHAPTERS, distinct)
    if target <= 1:
        return [0]
    fits = n >= _MIN_CHAPTER_LINES * target
    min_len = _MIN_CHAPTER_LINES if fits else max(1, n // (2 * target))
    scores = _boundary_scores(lines, exclude)
    span = n / target
    radius = max(1, int(span / 2))
    starts = [0]
    for k in range(1, target):
        ideal = round(k * span)
        lo = max(starts[-1] + min_len, ideal - radius)
        hi = min(n - (target - k) * min_len, ideal + radius)
        # Chapters seek the player, so each must start strictly later in time.
        options = [i for i in range(lo, hi + 1) if lines[i].start_ms > lines[starts[-1]].start_ms]
        if not options:
            continue
        best = max(
            options,
            key=lambda i: (
                scores[i] - _DISTANCE_PENALTY * abs(i - ideal) / span,
                -abs(i - ideal),
                -i,
            ),
        )
        starts.append(best)
    return starts


def _trigrams(text: str, exclude: frozenset[str]) -> Counter[str]:
    grams: Counter[str] = Counter()
    for sentence in sentences(text):
        toks = [w if is_content(w, exclude) else None for w in words(sentence)]
        grams.update(
            f"{a} {b} {c}"
            for a, b, c in zip(toks, toks[1:], toks[2:], strict=False)
            if a and b and c
        )
    return grams


def _extend(bigram: str, count: int, tri: Counter[str]) -> str:
    """ "center articles" -> "help center articles" when the longer phrase is
    always what was said."""
    parts = bigram.split()
    for gram in sorted(tri):
        g = gram.split()
        if tri[gram] == count >= 2 and (g[:2] == parts or g[1:] == parts):
            return gram
    return bigram


def _title(
    tf: Counter[str], tri: Counter[str], df: Counter[str], n_docs: int, taken: set[str]
) -> str | None:
    def score(term: str) -> float:
        return tf[term] * (math.log((n_docs + 1) / (df[term] + 0.5)) + 1)

    # Sorted before ranking so equal scores resolve by the term, not set order.
    unigrams = sorted((t for t in tf if " " not in t), key=lambda t: (-score(t), t))
    bigrams = sorted((t for t in tf if " " in t), key=lambda t: (-score(t), t))
    top = unigrams[0] if unigrams else None
    candidates: list[str] = []
    # A recurring phrase names the topic best; else the best phrase around the
    # chapter's key word ("replay" -> "replay tool"); else the word alone.
    candidates += [b for b in bigrams if tf[b] >= 2]
    if top is not None:
        candidates += [b for b in bigrams if top in b.split()]
    # Titles are at least two words when the chapter allows: any phrase actually
    # said, then the two most distinctive words ("Pricing and Rollout"), then one.
    candidates += bigrams
    candidates += [f"{a} and {b}" for a, b in zip(unigrams, unigrams[1:2], strict=False)]
    candidates += unigrams
    for term in candidates:
        if " " in term and " and " not in term:
            term = _extend(term, tf[term], tri)
        title = " ".join(_title_word(w) for w in term.split())
        if title not in taken:
            return title
    return None


_ACRONYMS = frozenset("api arr csv crm kpi okr qa sdk sla sso ui ux".split())


def _title_word(word: str) -> str:
    if word == "and":
        return word
    word = word.removesuffix("'s")
    return word.upper() if word in _ACRONYMS else word.capitalize()


def _titles(groups: list[list[TranscriptLine]], exclude: frozenset[str]) -> list[str]:
    texts = [" ".join(line.text for line in group) for group in groups]
    docs = [Counter(terms(text, exclude)) for text in texts]
    df: Counter[str] = Counter(term for doc in docs for term in doc)
    titles: list[str] = []
    for doc, text, group in zip(docs, texts, groups, strict=True):
        title = _title(doc, _trigrams(text, exclude), df, len(docs), set(titles))
        titles.append(title or f"Discussion at {fmt_ms(group[0].start_ms)}")
    return titles


def build_chapters(t: TranscriptForAI) -> list[Chapter]:
    lines = sorted(t.lines, key=lambda line: (line.start_ms, line.segment_id))
    if not lines:
        return []
    exclude = speaker_name_tokens(t)
    starts = _chapter_starts(lines, exclude)
    bounds = zip(starts, [*starts[1:], len(lines)], strict=True)
    groups = [lines[a:b] for a, b in bounds]
    titles = _titles(groups, exclude)
    return [
        Chapter(title=title, start_ms=group[0].start_ms, lines=group)
        for title, group in zip(titles, groups, strict=True)
    ]
