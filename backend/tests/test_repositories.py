from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, date, datetime

import pytest
from sqlalchemy import Engine, event
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.exceptions import ServiceUnavailableError
from app.db.session import make_session_factory
from app.db.unit_of_work import UnitOfWork
from app.models.enums import ActionItemStatus, MeetingSource, MeetingStatus
from app.repositories.meetings import MeetingFilters, MeetingRepository, MeetingSort
from app.schemas.common import PageParams
from tests import factories as f

PAGE = PageParams()


def at(day: int, hour: int = 12) -> datetime:
    return datetime(2026, 7, day, hour, tzinfo=UTC)


def titles(items: list) -> list[str]:  # type: ignore[type-arg]
    return [m.title for m in items]


@pytest.fixture
def repo(db_session: Session) -> MeetingRepository:
    return MeetingRepository(db_session)


@contextmanager
def count_queries(engine: Engine) -> Iterator[list[str]]:
    statements: list[str] = []

    def _on(conn, cursor, statement, *args):  # type: ignore[no-untyped-def]
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", _on)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", _on)


def run(repo: MeetingRepository, user_id: int = 0, sort: MeetingSort = MeetingSort.NEWEST, **kw):  # type: ignore[no-untyped-def]
    page = kw.pop("page", PAGE)
    return repo.list(MeetingFilters(**kw), page, sort, current_user_id=user_id)


def test_default_sort_newest_first_and_pagination(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    for d in range(1, 6):
        f.make_meeting(db_session, host=host, title=f"m{d}", started_at=at(d))
    items, total = run(repo, page=PageParams(page=1, page_size=2))
    assert titles(items) == ["m5", "m4"] and total == 5
    items, total = run(repo, page=PageParams(page=3, page_size=2))
    assert titles(items) == ["m1"] and total == 5
    items, _ = run(repo, sort=MeetingSort.OLDEST)
    assert titles(items)[0] == "m1"
    items, _ = run(repo, sort=MeetingSort.TITLE)
    assert titles(items) == ["m1", "m2", "m3", "m4", "m5"]


def test_longest_sort(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    f.make_meeting(db_session, host=host, title="short", duration_ms=1)
    f.make_meeting(db_session, host=host, title="long", duration_ms=999)
    items, _ = run(repo, sort=MeetingSort.LONGEST)
    assert titles(items) == ["long", "short"]


def test_title_q_case_insensitive_and_escaped(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    f.make_meeting(db_session, host=host, title="Pricing Review")
    f.make_meeting(db_session, host=host, title="100% done")
    f.make_meeting(db_session, host=host, title="a_b")
    f.make_meeting(db_session, host=host, title="axb")
    assert titles(run(repo, q="pricing")[0]) == ["Pricing Review"]
    assert titles(run(repo, q="%")[0]) == ["100% done"]
    assert titles(run(repo, q="a_b")[0]) == ["a_b"]


def test_q_matches_participant_name(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    m = f.make_meeting(db_session, host=host, title="x")
    f.make_participant(db_session, m, "Priya Natarajan")
    f.make_meeting(db_session, host=host, title="y")
    items, total = run(repo, q="priya")
    assert titles(items) == ["x"] and total == 1


def test_participant_filter_no_duplicates(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    m = f.make_meeting(db_session, host=host, title="x")
    f.make_participant(db_session, m, "Sam One")
    f.make_participant(db_session, m, "Sam Two")
    f.make_meeting(db_session, host=host, title="y")
    items, total = run(repo, participant="sam")
    assert titles(items) == ["x"] and total == 1


def test_date_range_inclusive_edges(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    f.make_meeting(
        db_session,
        host=host,
        title="before",
        started_at=datetime(2026, 7, 9, 23, 59, 59, tzinfo=UTC),
    )
    f.make_meeting(
        db_session, host=host, title="first", started_at=datetime(2026, 7, 10, tzinfo=UTC)
    )
    f.make_meeting(
        db_session,
        host=host,
        title="last",
        started_at=datetime(2026, 7, 12, 23, 59, 59, tzinfo=UTC),
    )
    f.make_meeting(
        db_session, host=host, title="after", started_at=datetime(2026, 7, 13, tzinfo=UTC)
    )
    items, _ = run(
        repo, date_from=date(2026, 7, 10), date_to=date(2026, 7, 12), sort=MeetingSort.OLDEST
    )
    assert titles(items) == ["first", "last"]
    assert titles(run(repo, date_from=date(2026, 7, 13))[0]) == ["after"]
    assert len(run(repo, date_to=date(2026, 7, 9))[0]) == 1


def test_tag_filter_any_of(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    a, b = f.make_tag(db_session), f.make_tag(db_session)
    m1 = f.make_meeting(db_session, host=host, title="m1")
    m2 = f.make_meeting(db_session, host=host, title="m2")
    f.make_meeting(db_session, host=host, title="m3")
    f.tag_meeting(db_session, m1, a)
    f.tag_meeting(db_session, m1, b)
    f.tag_meeting(db_session, m2, b)
    items, total = run(repo, tag_ids=(a.id, b.id), sort=MeetingSort.TITLE)
    assert titles(items) == ["m1", "m2"] and total == 2
    assert titles(run(repo, tag_ids=(a.id,))[0]) == ["m1"]


def test_host_channel_and_combined(db_session: Session, repo: MeetingRepository):
    h1, h2 = f.make_user(db_session), f.make_user(db_session)
    f.make_meeting(db_session, host=h1, title="a", started_at=at(1))
    f.make_meeting(db_session, host=h2, title="b", started_at=at(2))
    assert titles(run(repo, host_id=h2.id)[0]) == ["b"]
    items, _ = run(repo, host_id=h1.id, q="a", date_from=date(2026, 7, 1), date_to=date(2026, 7, 1))
    assert titles(items) == ["a"]
    assert run(repo, host_id=h1.id, q="b")[1] == 0


def test_scope_and_status(db_session: Session, repo: MeetingRepository):
    me, other = f.make_user(db_session), f.make_user(db_session)
    f.make_meeting(db_session, host=me, title="hosted")
    shared = f.make_meeting(db_session, host=other, title="shared")
    f.make_participant(db_session, shared, "Me", user=me)
    f.make_meeting(db_session, host=other, title="other")
    f.make_meeting(db_session, host=me, title="up", source=MeetingSource.UPLOAD)
    f.make_meeting(db_session, host=other, title="paste", source=MeetingSource.PASTE)
    assert sorted(titles(run(repo, me.id, scope="hosted")[0])) == ["hosted", "up"]
    assert titles(run(repo, me.id, scope="shared")[0]) == ["shared"]
    assert sorted(titles(run(repo, me.id, scope="uploads")[0])) == ["paste", "up"]
    assert run(repo, me.id)[1] == 5


def test_upcoming_vs_completed(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    future = datetime(2999, 1, 1, tzinfo=UTC)
    f.make_meeting(
        db_session, host=host, title="future", status=MeetingStatus.SCHEDULED, started_at=future
    )
    f.make_meeting(
        db_session, host=host, title="stale", status=MeetingStatus.SCHEDULED, started_at=at(1)
    )
    f.make_meeting(db_session, host=host, title="done")
    assert titles(run(repo, status="upcoming")[0]) == ["future"]
    assert sorted(titles(run(repo, status="completed")[0])) == ["done", "stale"]
    assert sorted(titles(run(repo)[0])) == ["done", "stale"]


def test_channel_filter(db_session: Session, repo: MeetingRepository):
    from app.models import Channel

    ch = Channel(name="Sales", slug="sales")
    db_session.add(ch)
    db_session.flush()
    host = f.make_user(db_session)
    f.make_meeting(db_session, host=host, title="in", channel_id=ch.id)
    f.make_meeting(db_session, host=host, title="out")
    assert titles(run(repo, channel_id=ch.id)[0]) == ["in"]


def test_soft_delete_restore_and_get(db_session: Session, repo: MeetingRepository):
    m = f.make_meeting(db_session)
    assert repo.get(m.id) is m
    repo.soft_delete(m)
    assert repo.get(m.id) is None
    assert repo.get(m.id, include_deleted=True) is m
    assert run(repo)[1] == 0
    repo.restore(m)
    assert m.deleted_at is None and run(repo)[1] == 1
    assert repo.get(99999) is None


def test_action_item_counts_single_query(
    migrated_engine: Engine, db_session: Session, repo: MeetingRepository
):
    host = f.make_user(db_session)
    ms = [f.make_meeting(db_session, host=host, title=f"m{i}") for i in range(20)]
    f.make_action_item(db_session, ms[0])
    f.make_action_item(db_session, ms[0], status=ActionItemStatus.COMPLETED)
    f.make_action_item(db_session, ms[0], status=ActionItemStatus.COMPLETED)
    with count_queries(migrated_engine) as stmts:
        counts = repo.action_item_counts([m.id for m in ms])
    assert len(stmts) == 1
    assert (counts[ms[0].id].open, counts[ms[0].id].completed) == (1, 2)
    assert ms[1].id not in counts
    assert repo.action_item_counts([]) == {}


def test_list_page_query_budget(
    migrated_engine: Engine, db_session: Session, repo: MeetingRepository
):
    host = f.make_user(db_session)
    tag = f.make_tag(db_session)
    for i in range(20):
        m = f.make_meeting(db_session, host=host, title=f"m{i}", started_at=at(1, i % 24))
        f.make_participant(db_session, m, "P")
        f.tag_meeting(db_session, m, tag)
    db_session.commit()
    db_session.expire_all()
    with count_queries(migrated_engine) as stmts:
        items, _ = run(repo)
        for m in items:
            _ = (m.host.name, [p.display_name for p in m.participants], [t.name for t in m.tags])
    assert len(items) == 20
    assert len(stmts) <= 6


def test_uow_exposes_repositories(db_session: Session):
    uow = UnitOfWork(db_session)
    for name in (
        "meetings",
        "transcript",
        "summaries",
        "action_items",
        "tags",
        "users",
        "comments",
        "highlights",
    ):
        assert hasattr(uow, name)


def test_get_current_user(migrated_engine: Engine):
    factory = make_session_factory(migrated_engine)
    with UnitOfWork(factory()) as uow:
        with pytest.raises(ServiceUnavailableError) as exc:
            get_current_user(uow)
        assert exc.value.code == "NOT_SEEDED"
        first = f.make_user(uow.session)
        f.make_user(uow.session)
        assert get_current_user(uow).id == first.id
