"""Transcript search with snippets and match ranges (offsets, never markup)."""

import re

from app.core.exceptions import ValidationFailedError
from app.db.search import SegmentHit, query_tokens, search_segments
from app.db.unit_of_work import UnitOfWork
from app.schemas.common import Page, PageParams
from app.schemas.search import MatchRange, SearchHit

SNIPPET_CHARS = 160
_LEAD_CHARS = 60  # context kept before the first match
_ELLIPSIS = "…"


def _ranges(text: str, tokens: list[str]) -> list[MatchRange]:
    """Whole-word matches, with the last token also matching as a prefix (mirrors the FTS query)."""
    spans: list[tuple[int, int]] = []
    for i, token in enumerate(tokens):
        tail = r"\w*" if i == len(tokens) - 1 else r"\b"
        spans += [m.span() for m in re.finditer(rf"\b{re.escape(token)}{tail}", text, re.I)]
    merged: list[MatchRange] = []
    for start, end in sorted(spans):
        if merged and start <= merged[-1].end:
            merged[-1].end = max(merged[-1].end, end)
        else:
            merged.append(MatchRange(start=start, end=end))
    return merged


def make_snippet(text: str, tokens: list[str]) -> tuple[str, list[MatchRange]]:
    found = _ranges(text, tokens)
    if len(text) <= SNIPPET_CHARS:
        return text, found
    first = found[0].start if found else 0
    start = max(0, first - _LEAD_CHARS)
    end = min(len(text), start + SNIPPET_CHARS)
    prefix = _ELLIPSIS if start > 0 else ""
    suffix = _ELLIPSIS if end < len(text) else ""
    snippet = prefix + text[start:end] + suffix
    shift = len(prefix) - start
    ranges = [
        MatchRange(start=r.start + shift, end=min(r.end, end) + shift)
        for r in found
        if r.start >= start and r.start < end
    ]
    return snippet, ranges


class SearchService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def search(self, q: str, page: PageParams) -> Page[SearchHit]:
        tokens = query_tokens(q)
        if not tokens:
            raise ValidationFailedError("Search query cannot be blank", code="QUERY_REQUIRED")
        hits, total = search_segments(self.uow.session, q, limit=page.page_size, offset=page.offset)
        return Page(
            items=[_to_hit(h, tokens) for h in hits],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )


def _to_hit(hit: SegmentHit, tokens: list[str]) -> SearchHit:
    snippet, ranges = make_snippet(hit.text, tokens)
    return SearchHit(
        meeting_id=hit.meeting_id,
        meeting_title=hit.meeting_title,
        segment_id=hit.segment_id,
        start_ms=hit.start_ms,
        speaker=hit.speaker_label,
        snippet=snippet,
        ranges=ranges,
    )
