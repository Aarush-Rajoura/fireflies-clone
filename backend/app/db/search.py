"""Safe FTS5 search over transcript segments.

transcript_fts is maintained by triggers and still contains segments of
soft-deleted meetings, so every query joins back to meetings and filters
deleted_at; that join lives only here.
"""

import re
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

# FTS5 syntax characters (quotes, *, -, :, parentheses) are user text, not operators.
_TOKEN = re.compile(r"\w+", re.UNICODE)

_FROM = """
    FROM transcript_fts
    JOIN transcript_segments AS s ON s.id = transcript_fts.rowid
    JOIN meetings AS m ON m.id = s.meeting_id
    JOIN speakers AS sp ON sp.id = s.speaker_id
    LEFT JOIN participants AS p ON p.id = sp.participant_id
    WHERE transcript_fts MATCH :q
      AND m.deleted_at IS NULL
      AND (:meeting_id IS NULL OR s.meeting_id = :meeting_id)
"""

_ROWS = text(
    f"""
    SELECT s.id AS segment_id, s.meeting_id AS meeting_id, m.title AS meeting_title,
           COALESCE(p.display_name, sp.label) AS speaker_label,
           s.start_ms AS start_ms, s.text AS text, bm25(transcript_fts) AS rank
    {_FROM}
    ORDER BY rank, s.id
    LIMIT :limit OFFSET :offset
    """
)
_COUNT = text(f"SELECT count(*) {_FROM}")


@dataclass(frozen=True)
class SegmentHit:
    segment_id: int
    meeting_id: int
    meeting_title: str
    speaker_label: str
    start_ms: int
    text: str
    rank: float  # bm25: lower (more negative) is more relevant


def to_fts_query(raw: str) -> str:
    """Quote each word token; prefix-match the last. Empty string means no usable input."""
    tokens = _TOKEN.findall(raw)
    if not tokens:
        return ""
    quoted = [f'"{t}"' for t in tokens]
    quoted[-1] += "*"
    return " ".join(quoted)


def search_segments(
    session: Session,
    query: str,
    *,
    meeting_id: int | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[SegmentHit], int]:
    match = to_fts_query(query)
    if not match:
        return [], 0
    params = {"q": match, "meeting_id": meeting_id}
    total = int(session.execute(_COUNT, params).scalar_one())
    rows = session.execute(_ROWS, {**params, "limit": limit, "offset": offset}).mappings()
    return [SegmentHit(**row) for row in rows], total
