import pytest
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.exceptions import ServiceUnavailableError
from app.db.session import make_session_factory
from app.db.unit_of_work import UnitOfWork
from app.models import Participant
from app.models.enums import ActionItemStatus
from app.repositories.meetings import MeetingRepository
from app.services.users import UserService
from tests import factories as f
from tests.repo_helpers import at, count_queries, run


@pytest.fixture
def repo(db_session: Session) -> MeetingRepository:
    return MeetingRepository(db_session)


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


def test_current_user_is_the_first_user(migrated_engine: Engine):
    factory = make_session_factory(migrated_engine)
    with UnitOfWork(factory()) as uow:
        with pytest.raises(ServiceUnavailableError) as exc:
            UserService(uow).me()
        assert exc.value.code == "NOT_SEEDED"
        first = f.make_user(uow.session)
        f.make_user(uow.session)
        assert UserService(uow).me().id == first.id


def test_get_detail_loads_relations(db_session: Session, repo: MeetingRepository):
    m = f.make_meeting(db_session)
    f.make_participant(db_session, m, "Zed")
    f.tag_meeting(db_session, m, f.make_tag(db_session, "t"))
    db_session.commit()
    db_session.expire_all()
    got = repo.get_detail(m.id)
    assert got is not None
    assert got.host.name and [p.display_name for p in got.participants] == ["Zed"]
    assert [t.name for t in got.tags] == ["t"]
    repo.soft_delete(got)
    assert repo.get_detail(m.id) is None
    assert repo.get_detail(m.id, include_deleted=True) is not None


def test_tag_attach_detach_refreshes_meeting_tags(db_session: Session):
    repos = UnitOfWork(db_session)
    m = f.make_meeting(db_session)
    tag = f.make_tag(db_session, "x")
    loaded = repos.meetings.get_detail(m.id)
    assert loaded is not None and loaded.tags == []
    repos.tags.attach(m.id, tag.id)
    again = repos.meetings.get_detail(m.id)
    assert again is not None and [t.name for t in again.tags] == ["x"]
    repos.tags.detach(m.id, tag.id)
    final = repos.meetings.get_detail(m.id)
    assert final is not None and final.tags == []


def test_participant_repository(db_session: Session):
    uow = UnitOfWork(db_session)
    m = f.make_meeting(db_session)
    loaded = uow.meetings.get_detail(m.id)
    assert loaded is not None and loaded.participants == []
    p = uow.participants.add(Participant(meeting_id=m.id, display_name="Ada Lovelace"))
    assert uow.participants.get(p.id) is p
    assert uow.participants.find_by_name(m.id, "ada LOVELACE") is p
    assert uow.participants.find_by_name(m.id, "nobody") is None
    assert uow.participants.list_for_meeting(m.id) == [p]
    refreshed = uow.meetings.get_detail(m.id)
    assert refreshed is not None and len(refreshed.participants) == 1
    uow.participants.delete(p)
    assert uow.participants.list_for_meeting(m.id) == []
    refreshed = uow.meetings.get_detail(m.id)
    assert refreshed is not None and refreshed.participants == []
