import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationFailedError
from app.schemas.common import PageParams
from app.services.search import SearchService, make_snippet
from tests import factories as f
from tests.service_helpers import seeded


@pytest.mark.parametrize("q", ["", "   ", "***"])
def test_blank_query_is_422(db_session: Session, q: str) -> None:
    uow, _, _ = seeded(db_session)
    with pytest.raises(ValidationFailedError):
        SearchService(uow).search(q, PageParams())


def _marked(text: str, word: str) -> str:
    return text.replace(word, f"\x02{word}\x03")


def test_snippet_windows_long_text() -> None:
    text = ("lorem " * 60) + "budget review here " + ("ipsum " * 60)
    snippet, ranges = make_snippet(_marked(text, "budget"))
    assert len(snippet) < len(text) and snippet.startswith("…")
    assert [snippet[r.start : r.end] for r in ranges] == ["budget"]


def test_short_text_untouched() -> None:
    snippet, ranges = make_snippet("\x02Hello\x03 \x02hello\x03 world")
    assert snippet == "Hello hello world"
    assert [(r.start, r.end) for r in ranges] == [(0, 5), (6, 11)]


def _hit_ranges(db: Session, text: str, q: str) -> list[str]:
    uow, _, m = seeded(db)
    f.make_segment(db, m, f.make_speaker(db, m), text)
    db.commit()
    hit = SearchService(uow).search(q, PageParams()).items[0]
    return [hit.snippet[r.start : r.end] for r in hit.ranges]


def test_ranges_cover_stems(db_session: Session) -> None:
    assert _hit_ranges(db_session, "We cut the budgets today", "budget") == ["budgets"]


def test_ranges_cover_accents(db_session: Session) -> None:
    assert _hit_ranges(db_session, "Let us meet at the café", "cafe") == ["café"]
