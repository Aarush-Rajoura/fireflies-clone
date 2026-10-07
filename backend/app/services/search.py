"""Transcript search with snippets and match ranges (offsets, never markup)."""

from app.core.exceptions import ValidationFailedError
from app.db.search import MARK_END, MARK_START, SegmentHit, query_tokens, search_segments
from app.db.unit_of_work import UnitOfWork
from app.schemas.common import Page, PageParams
from app.schemas.search import MatchRange, SearchHit

SNIPPET_CHARS = 160
_LEAD_CHARS = 60  # context kept before the first match
_ELLIPSIS = "…"


def _unmark(marked: str) -> tuple[str, list[MatchRange]]:
    """Split FTS5 highlight() output into plain text and match offsets."""
    plain: list[str] = []
    ranges: list[MatchRange] = []
    open_at: int | None = None
    length = 0
    for ch in marked:
        if ch == MARK_START:
            open_at = length
        elif ch == MARK_END:
            if open_at is not None and length > open_at:
                ranges.append(MatchRange(start=open_at, end=length))
            open_at = None
        else:
            plain.append(ch)
            length += 1
    return "".join(plain), ranges


def make_snippet(marked: str) -> tuple[str, list[MatchRange]]:
    text, found = _unmark(marked)
    if len(text) <= SNIPPET_CHARS:
        return text, found
    first = found[0].start if found else 0
    start = max(0, first - _LEAD_CHARS)
    end = min(len(text), start + SNIPPET_CHARS)
    prefix = _ELLIPSIS if start > 0 else ""
    suffix = _ELLIPSIS if end < len(text) else ""
    shift = len(prefix) - start
    ranges = [
        MatchRange(start=r.start + shift, end=min(r.end, end) + shift)
        for r in found
        if start <= r.start < end
    ]
    return prefix + text[start:end] + suffix, ranges


class SearchService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def search(self, q: str, page: PageParams) -> Page[SearchHit]:
        """Flat bm25-ranked hits; grouping by meeting is the client's job."""
        if not query_tokens(q):
            raise ValidationFailedError("Search query cannot be blank", code="QUERY_REQUIRED")
        hits, total = search_segments(self.uow.session, q, limit=page.page_size, offset=page.offset)
        return Page(
            items=[_to_hit(h) for h in hits],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )


def _to_hit(hit: SegmentHit) -> SearchHit:
    snippet, ranges = make_snippet(hit.marked)
    return SearchHit(
        meeting_id=hit.meeting_id,
        meeting_title=hit.meeting_title,
        segment_id=hit.segment_id,
        start_ms=hit.start_ms,
        speaker=hit.speaker_label,
        snippet=snippet,
        ranges=ranges,
    )
