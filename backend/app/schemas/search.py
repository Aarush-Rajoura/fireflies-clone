from pydantic import BaseModel


class MatchRange(BaseModel):
    """Half-open character offsets into the snippet; the client wraps them, never raw HTML."""

    start: int
    end: int


class SearchHit(BaseModel):
    meeting_id: int
    meeting_title: str
    segment_id: int
    start_ms: int
    speaker: str
    snippet: str
    ranges: list[MatchRange]
