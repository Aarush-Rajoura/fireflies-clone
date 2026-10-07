import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationFailedError
from app.schemas.common import PageParams
from app.services.search import SearchService, make_snippet
from tests.service_helpers import seeded


@pytest.mark.parametrize("q", ["", "   ", "***"])
def test_blank_query_is_422(db_session: Session, q: str) -> None:
    uow, _, _ = seeded(db_session)
    with pytest.raises(ValidationFailedError):
        SearchService(uow).search(q, PageParams())


def test_snippet_windows_long_text_and_marks_tokens() -> None:
    text = ("lorem " * 60) + "budget review for the Roadmap here " + ("ipsum " * 60)
    snippet, ranges = make_snippet(text, ["budget", "road"])
    assert len(snippet) < len(text) and snippet.startswith("…")
    found = {snippet[r.start : r.end].lower() for r in ranges}
    assert found == {"budget", "roadmap"}
    assert all(r.start < r.end for r in ranges)


def test_short_text_untouched() -> None:
    snippet, ranges = make_snippet("Hello hello world", ["hello"])
    assert snippet == "Hello hello world"
    assert [(r.start, r.end) for r in ranges] == [(0, 5), (6, 11)]
