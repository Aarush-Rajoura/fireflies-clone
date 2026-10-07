from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import GoneError, NotFoundError, ValidationFailedError
from app.models.enums import ActionItemSource, ActionItemStatus
from app.schemas.action_item import ActionItemCreate, ActionItemUpdate
from app.schemas.common import PageParams
from app.services.action_items import ActionItemService
from tests import factories as f
from tests.service_helpers import seeded


def test_list_is_paged_and_ordered_by_sequence(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    b = f.make_action_item(db_session, m, text="second")
    a = f.make_action_item(db_session, m, text="first")
    a.sequence, b.sequence = 0, 1
    db_session.commit()
    page = ActionItemService(uow).list(m.id, PageParams(page=1, page_size=1))
    assert [i.text for i in page.items] == ["first"]
    assert (page.total, page.has_next) == (2, True)


def test_create_is_manual_with_next_sequence(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    alice = f.make_participant(db_session, m, "Alice")
    db_session.commit()
    svc = ActionItemService(uow)
    one = svc.create(m.id, ActionItemCreate(text=" Send deck ", assignee_participant_id=alice.id))
    two = svc.create(m.id, ActionItemCreate(text="Book room", due_date=date(2026, 8, 1)))
    assert one.source == ActionItemSource.MANUAL and one.text == "Send deck"
    assert one.assignee is not None and one.assignee.display_name == "Alice"
    assert two.due_date == date(2026, 8, 1) and two.assignee is None
    assert [i.id for i in svc.list(m.id, PageParams()).items] == [one.id, two.id]


def test_assignee_from_other_meeting_is_422(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    other = f.make_meeting(db_session, host=user)
    stranger = f.make_participant(db_session, other, "Bob")
    item = f.make_action_item(db_session, m)
    db_session.commit()
    svc = ActionItemService(uow)
    with pytest.raises(ValidationFailedError) as err:
        svc.create(m.id, ActionItemCreate(text="x", assignee_participant_id=stranger.id))
    assert err.value.code == "ASSIGNEE_NOT_IN_MEETING"
    with pytest.raises(ValidationFailedError) as err:
        svc.update(item.id, ActionItemUpdate(assignee_participant_id=9999))
    assert err.value.code == "ASSIGNEE_NOT_IN_MEETING"


def test_complete_and_reopen_toggle_completed_at(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    item = f.make_action_item(db_session, m)
    db_session.commit()
    svc = ActionItemService(uow)
    done = svc.update(item.id, ActionItemUpdate(status=ActionItemStatus.COMPLETED))
    assert done.status == ActionItemStatus.COMPLETED and done.completed_at is not None
    assert done.completed_at.tzinfo is not None
    again = svc.update(item.id, ActionItemUpdate(status=ActionItemStatus.COMPLETED))
    assert again.completed_at == done.completed_at
    reopened = svc.update(item.id, ActionItemUpdate(status=ActionItemStatus.OPEN))
    assert reopened.status == ActionItemStatus.OPEN and reopened.completed_at is None


def test_update_partial_and_null_clears(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    alice = f.make_participant(db_session, m, "Alice")
    item = f.make_action_item(db_session, m, text="old")
    item.assignee_participant_id = alice.id
    item.due_date = date(2026, 8, 1)
    db_session.commit()
    svc = ActionItemService(uow)
    out = svc.update(item.id, ActionItemUpdate(text="new"))
    assert out.text == "new" and out.assignee is not None and out.due_date is not None
    out = svc.update(item.id, ActionItemUpdate(assignee_participant_id=None, due_date=None))
    assert out.assignee is None and out.due_date is None and out.text == "new"


def test_delete_and_missing(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    item = f.make_action_item(db_session, m)
    db_session.commit()
    svc = ActionItemService(uow)
    svc.delete(item.id)
    assert svc.list(m.id, PageParams()).total == 0
    with pytest.raises(NotFoundError) as err:
        svc.delete(item.id)
    assert err.value.code == "ACTION_ITEM_NOT_FOUND"


def test_writes_on_deleted_meeting_are_gone(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    item = f.make_action_item(db_session, m)
    uow.meetings.soft_delete(m)
    db_session.commit()
    svc = ActionItemService(uow)
    with pytest.raises(GoneError):
        svc.create(m.id, ActionItemCreate(text="x"))
    with pytest.raises(GoneError):
        svc.update(item.id, ActionItemUpdate(text="y"))
    with pytest.raises(GoneError):
        svc.delete(item.id)
    with pytest.raises(GoneError):
        svc.list(m.id, PageParams())
