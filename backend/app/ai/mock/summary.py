"""Extractive overview and per-chapter notes.

Sentences are scored by the TF-IDF weight of the topic words they contain,
normalised by length so a rambling line does not win by size alone. Questions
and short fragments are skipped: they rarely state anything a reader needs.
"""

import math
from dataclasses import dataclass

from app.ai.mock.keywords import score_terms, top_keywords
from app.ai.mock.outline import build_chapters
from app.ai.mock.text_utils import (
    as_sentence,
    content_words,
    sentences,
    speaker_name_tokens,
    words,
)
from app.ai.types import NoteGroup, OutlineEntry, SummaryResult, TranscriptForAI, TranscriptLine

_MIN_SENTENCE_WORDS = 5
_OVERVIEW_EXTRACTS = 3
_BULLETS_PER_CHAPTER = 3


@dataclass(frozen=True)
class _Scored:
    order: tuple[int, int, int]  # (start_ms, segment_id, sentence): global, chronological
    speaker: str
    text: str
    score: float


def _score_sentences(
    lines: list[TranscriptLine], weights: dict[str, float], exclude: frozenset[str]
) -> list[_Scored]:
    scored: list[_Scored] = []
    for line in lines:
        for k, sentence in enumerate(sentences(line.text)):
            n_words = len(words(sentence))
            if n_words < _MIN_SENTENCE_WORDS or sentence.endswith("?"):
                continue
            topic = sorted(set(content_words(sentence, exclude)))
            score = sum(weights.get(w, 0.0) for w in topic) / math.sqrt(n_words)
            order = (line.start_ms, line.segment_id, k)
            scored.append(_Scored(order, line.speaker, sentence, score))
    return scored


def _best(scored: list[_Scored], k: int) -> list[_Scored]:
    top = sorted(scored, key=lambda s: (-s.score, s.order))[:k]
    return sorted(top, key=lambda s: s.order)


def _join_terms(terms: list[str]) -> str:
    if len(terms) == 1:
        return terms[0]
    return ", ".join(terms[:-1]) + " and " + terms[-1]


def _overview(t: TranscriptForAI, per_chapter: list[list[_Scored]], kws: list[str]) -> str:
    subject = t.meeting_title.strip() or "The meeting"
    speakers = sorted({line.speaker for line in t.lines})
    lead = (
        f"{subject} covered {_join_terms(kws[:3])}."
        if kws
        else f"{subject} was a conversation between {_join_terms(speakers)}."
    )
    # One standout sentence from each of the first chapters: coverage beats
    # quoting three lines about the same topic.
    picks = [_best(group, 1)[0] for group in per_chapter if group][:_OVERVIEW_EXTRACTS]
    body = [as_sentence(p.text) for p in sorted(picks, key=lambda p: p.order)]
    if not body:
        body = [f"Participants were {_join_terms(speakers)}."]
    return " ".join([lead, *body])


def summarize(t: TranscriptForAI) -> SummaryResult:
    if not t.lines:
        return SummaryResult(
            overview="This meeting has no transcript to summarise yet.",
            outline=[],
            notes=[],
            keywords=[],
        )
    exclude = speaker_name_tokens(t)
    weights = score_terms([line.text for line in t.lines], exclude)
    keywords = top_keywords([line.text for line in t.lines], exclude)
    chapters = build_chapters(t)
    per_chapter = [_score_sentences(ch.lines, weights, exclude) for ch in chapters]
    notes = []
    for chapter, scored in zip(chapters, per_chapter, strict=True):
        best = _best(scored, _BULLETS_PER_CHAPTER)
        bullets = [f"{s.speaker}: {as_sentence(s.text)}" for s in best]
        if not bullets:  # only questions or fragments: keep the opening line
            first = chapter.lines[0]
            bullets = [f"{first.speaker}: {as_sentence(first.text)}"]
        notes.append(NoteGroup(title=chapter.title, bullets=bullets))
    return SummaryResult(
        overview=_overview(t, per_chapter, [k.term for k in keywords]),
        outline=[OutlineEntry(title=ch.title, start_ms=ch.start_ms) for ch in chapters],
        notes=notes,
        keywords=keywords,
    )
