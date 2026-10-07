"""Q&A by term overlap.

Passages are ranked by the IDF-weighted overlap between their words and the
question's (rare shared words count more than common ones); the answer quotes
the best few, and those become the citations. It never invents anything: if
no passage shares a topic word with the question, it says so and cites none.
"""

import math
from collections import Counter

from app.ai.mock.text_utils import content_words, fmt_ms, stem
from app.ai.types import Answer, Citation, Passage

MAX_SOURCES = 3
_QUOTE_CHARS = 220
NO_ANSWER = "I couldn't find anything in the meeting that answers that question."


def _bag(text: str) -> set[str]:
    return {stem(w) for w in content_words(text)}


def rank_passages(question: str, passages: list[Passage]) -> list[tuple[float, Passage]]:
    """Relevant passages, best first; ties keep the original (chronological) order."""
    query = _bag(question)
    bags = [_bag(p.text) for p in passages]
    df: Counter[str] = Counter(term for bag in bags for term in bag)
    n = len(passages)
    scored: list[tuple[float, int, Passage]] = []
    for index, (passage, bag) in enumerate(zip(passages, bags, strict=True)):
        shared = query & bag
        if not shared:
            continue
        score = sum(math.log((n + 1) / df[term]) + 1 for term in sorted(shared))
        # Mild length normalisation: a long passage matches more by chance.
        score /= math.sqrt(1 + len(bag) / 12)
        scored.append((score, index, passage))
    scored.sort(key=lambda s: (-s[0], s[1]))
    return [(score, passage) for score, _, passage in scored]


def _quote(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= _QUOTE_CHARS else text[: _QUOTE_CHARS - 1].rstrip() + "…"


def _attribution(p: Passage, many_meetings: bool) -> str:
    who = p.speaker or "The summary"
    where = f" in {p.meeting_title}" if many_meetings else ""
    when = f" at {fmt_ms(p.start_ms)}" if p.start_ms is not None else ""
    return f"{who}{where}{when}"


def answer(question: str, passages: list[Passage]) -> Answer:
    top = [p for _, p in rank_passages(question, passages)[:MAX_SOURCES]]
    if not top:
        return Answer(text=NO_ANSWER, citations=[])
    many = len({p.meeting_id for p in passages}) > 1
    parts = [f'{_attribution(p, many)}: "{_quote(p.text)}"' for p in top]
    text = "Here is what was said about that. " + " ".join(parts)
    citations = [
        Citation(segment_id=p.segment_id, start_ms=p.start_ms, quote=_quote(p.text))
        for p in top
        if p.segment_id is not None and p.start_ms is not None
    ]
    return Answer(text=text, citations=citations)
