import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import GoneError, NotFoundError, ValidationFailedError
from app.models import ActionItem, Channel
from app.repositories.meeting_filters import MeetingFilters, MeetingSort
from app.schemas.common import PageParams
from app.schemas.meeting import MeetingUpdate
from app.services.meetings import MeetingService
from tests import factories as f
from tests.service_helpers import seeded

PAGE = PageParams()


def _list(svc: MeetingService, **filters: object):  # type: ignore[no-untyped-def]
    return svc.list(MeetingFilters(**filters), PAGE, MeetingSort.NEWEST)  # type: ignore[arg-type]


def test_list_envelope_and_light_shape(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    for name in ("A", "B", "C", "D", "E", "F", "G"):
        f.make_participant(db_session, m, name)
    f.make_action_item(db_session, m)
    f.make_action_item(db_session, m, status=f.ActionItemStatus.COMPLETED)
    db_session.commit()
    page = _list(MeetingService(uow))
    assert (page.total, page.page, page.has_next) == (1, 1, False)
    item = page.items[0]
    assert item.participant_count == 7 and len(item.participants) == 5
    assert (item.action_item_counts.open, item.action_item_counts.completed) == (1, 1)
    assert item.host.id == user.id and item.has_media is False


def test_list_does_not_touch_transcript(db_session: Session) -> None:
    from tests.repo_helpers import count_queries

    uow, _, m = seeded(db_session)
    sp = f.make_speaker(db_session, m)
    f.make_segment(db_session, m, sp, "hello")
    db_session.commit()
    with count_queries(db_session.get_bind()) as stmts:  # type: ignore[arg-type]
        _list(MeetingService(uow))
    assert not any("transcript_segments" in s for s in stmts)


def test_filters_pass_through(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    ch = Channel(name="Eng", slug="eng")
    db_session.add(ch)
    db_session.flush()
    f.make_meeting(db_session, title="Other", channel_id=ch.id)
    db_session.commit()
    svc = MeetingService(uow)
    assert [i.title for i in _list(svc, channel_id=ch.id).items] == ["Other"]
    assert _list(svc, scope="hosted").total == 1


def test_get_missing_and_deleted(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    svc = MeetingService(uow)
    with pytest.raises(NotFoundError) as nf:
        svc.get(9999)
    assert nf.value.code == "MEETING_NOT_FOUND"
    svc.delete(m.id)
    with pytest.raises(GoneError) as gone:
        svc.get(m.id)
    assert gone.value.code == "MEETING_DELETED"
    with pytest.raises(GoneError):
        svc.delete(m.id)


def test_delete_restore_round_trip(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    svc = MeetingService(uow)
    svc.delete(m.id)
    assert _list(svc).total == 0
    assert svc.restore(m.id).id == m.id
    assert _list(svc).total == 1


def test_restore_active_meeting_is_a_noop_detail(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    assert MeetingService(uow).restore(m.id).title == m.title


def test_update_fields_and_channel(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    ch = Channel(name="Eng", slug="eng")
    db_session.add(ch)
    db_session.commit()
    svc = MeetingService(uow)
    out = svc.update(m.id, MeetingUpdate(title="New", description="d", channel_id=ch.id))
    assert (out.title, out.description, out.channel_id) == ("New", "d", ch.id)
    assert svc.update(m.id, MeetingUpdate(channel_id=None)).channel_id is None
    with pytest.raises(ValidationFailedError) as err:
        svc.update(m.id, MeetingUpdate(channel_id=999))
    assert err.value.code == "CHANNEL_NOT_FOUND"


def test_update_on_deleted_meeting_is_gone(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    svc = MeetingService(uow)
    svc.delete(m.id)
    with pytest.raises(GoneError):
        svc.update(m.id, MeetingUpdate(title="x"))


def test_participant_rename_keeps_speaker_and_assignee(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    ann = f.make_participant(db_session, m, "Ann")
    f.make_participant(db_session, m, "Bob")
    sp = f.make_speaker(db_session, m, "Speaker 1")
    sp.participant_id = ann.id
    item = f.make_action_item(db_session, m)
    item.assignee_participant_id = ann.id
    db_session.commit()
    out = MeetingService(uow).update(
        m.id,
        MeetingUpdate(
            participants=[{"id": ann.id, "display_name": "Anna"}, {"display_name": "Cy"}]  # type: ignore[list-item]
        ),
    )
    names = {p.display_name for p in out.participants}
    assert names == {"Anna", "Cy"}
    assert out.speakers[0].participant_id == ann.id and out.speakers[0].name == "Anna"
    assert db_session.get(ActionItem, item.id).assignee_participant_id == ann.id  # type: ignore[union-attr]


def test_participant_removal_unlinks_speaker(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    ann = f.make_participant(db_session, m, "Ann")
    sp = f.make_speaker(db_session, m, "Speaker 1")
    sp.participant_id = ann.id
    db_session.commit()
    out = MeetingService(uow).update(m.id, MeetingUpdate(participants=[]))
    assert out.participants == []
    assert out.speakers[0].participant_id is None and out.speakers[0].name == "Speaker 1"


def test_participants_by_name_match_existing(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    ann = f.make_participant(db_session, m, "Ann")
    db_session.commit()
    out = MeetingService(uow).update(m.id, MeetingUpdate(participants=["ann", "Bo"]))  # type: ignore[list-item]
    assert {p.id for p in out.participants} >= {ann.id} and len(out.participants) == 2


def test_unknown_participant_id_is_422(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    with pytest.raises(ValidationFailedError) as err:
        MeetingService(uow).update(
            m.id,
            MeetingUpdate(participants=[{"id": 777, "display_name": "Z"}]),  # type: ignore[list-item]
        )
    assert err.value.code == "PARTICIPANT_NOT_FOUND"


def test_participant_swap_and_name_collision(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    ann = f.make_participant(db_session, m, "Ann")
    bob = f.make_participant(db_session, m, "Bob")
    db_session.commit()
    svc = MeetingService(uow)
    out = svc.update(
        m.id,
        MeetingUpdate(
            participants=[
                {"id": ann.id, "display_name": "Bob"},  # type: ignore[list-item]
                {"id": bob.id, "display_name": "Ann"},  # type: ignore[list-item]
            ]
        ),
    )
    assert {p.id: p.display_name for p in out.participants} == {ann.id: "Bob", bob.id: "Ann"}


def test_list_without_users_is_503(db_session: Session) -> None:
    from app.core.exceptions import ServiceUnavailableError
    from app.db.unit_of_work import UnitOfWork

    with pytest.raises(ServiceUnavailableError) as err:
        _list(MeetingService(UnitOfWork(db_session)))
    assert err.value.code == "NOT_SEEDED"
