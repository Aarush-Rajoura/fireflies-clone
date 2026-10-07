import pytest
from sqlalchemy.orm import Session

from app.db.search import search_segments, to_fts_query
from tests import factories as f


def test_query_builder_quotes_tokens_and_prefixes_last() -> None:
    assert to_fts_query("pricing mod") == '"pricing" "mod"*'


@pytest.mark.parametrize("raw", ["", "   ", '"', "*", "-", "(", ":", '"*-():'])
def test_query_builder_empty_when_nothing_usable(raw: str) -> None:
    assert to_fts_query(raw) == ""


@pytest.mark.parametrize("raw", ['"', "*", "-foo", "a:b", "(", "naïve", "a.*b", "NEAR(", "OR AND"])
def test_search_never_raises(db_session: Session, raw: str) -> None:
    m = f.make_meeting(db_session, title="Naïve plan")
    sp = f.make_speaker(db_session, m)
    f.make_segment(db_session, m, sp, "a naïve foo approach a b", sequence=0)
    hits, total = search_segments(db_session, raw, limit=10, offset=0)
    assert total == len(hits) or total >= len(hits)


def test_search_results_and_prefix(db_session: Session) -> None:
    m = f.make_meeting(db_session, title="Roadmap")
    sp = f.make_speaker(db_session, m, "Ana")
    seg = f.make_segment(db_session, m, sp, "We discussed the pricing model", sequence=0)
    f.make_segment(db_session, m, sp, "Lunch was great", sequence=1)
    hits, total = search_segments(db_session, "pricing mod", limit=10, offset=0)
    assert total == 1
    assert hits[0].segment_id == seg.id
    assert hits[0].meeting_title == "Roadmap"
    assert hits[0].speaker_label == "Ana"
    assert hits[0].text == "We discussed the pricing model"
    hits, _ = search_segments(db_session, "naive", limit=10, offset=0)
    assert hits == []


def test_search_meeting_scope_and_paging(db_session: Session) -> None:
    a, b = f.make_meeting(db_session), f.make_meeting(db_session)
    for m in (a, b):
        sp = f.make_speaker(db_session, m)
        for i in range(3):
            f.make_segment(db_session, m, sp, f"budget item {i}", sequence=i)
    _, total = search_segments(db_session, "budget", limit=10, offset=0)
    assert total == 6
    hits, total = search_segments(db_session, "budget", meeting_id=a.id, limit=2, offset=2)
    assert total == 3 and len(hits) == 1 and hits[0].meeting_id == a.id


def test_soft_deleted_excluded_from_search_but_in_raw_fts(db_session: Session) -> None:
    from datetime import UTC, datetime

    from sqlalchemy import text

    m = f.make_meeting(db_session, deleted_at=datetime(2026, 8, 1, tzinfo=UTC))
    sp = f.make_speaker(db_session, m)
    f.make_segment(db_session, m, sp, "secret launch", sequence=0)
    hits, total = search_segments(db_session, "secret", limit=10, offset=0)
    assert hits == [] and total == 0
    raw = db_session.execute(
        text("SELECT count(*) FROM transcript_fts WHERE transcript_fts MATCH 'secret'")
    ).scalar()
    assert raw == 1
