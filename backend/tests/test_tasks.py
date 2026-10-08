from datetime import UTC, date, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import GoneError, ValidationFailedError
from app.models.enums import ActionItemSource, ActionItemStatus
from app.schemas.action_item import ActionItemUpdate, TaskCreate, TaskFilters
from app.schemas.common import PageParams
from app.services.action_items import ActionItemService
from tests import factories as f
from tests.service_helpers import seeded

# 20:00Z on Oct 8 is already 01:30 on Oct 9 in India (UTC+5:30).
EVENING_UTC = datetime(2026, 10, 8, 20, 0, tzinfo=UTC)


def _svc(uow: Any, now: datetime = EVENING_UTC) -> ActionItemService:
    return ActionItemService(uow, clock=lambda: now)


def _texts(svc: ActionItemService, **filters: Any) -> list[str]:
    page = svc.list_tasks(TaskFilters(**filters), PageParams(page_size=100))
    return [i.text for i in page.items]


def test_mine_covers_direct_linked_participant_and_creator(db_session: Session) -> None:
    uow, me, m = seeded(db_session)
    other = f.make_user(db_session, name="Other")
    me_in_meeting = f.make_participant(db_session, m, "Me", user=me)
    stranger = f.make_participant(db_session, m, "Stranger")
    other_linked = f.make_participant(db_session, m, "Other", user=other)
    f.make_action_item(db_session, m, text="via participant", assignee=me_in_meeting)
    f.make_action_item(db_session, None, text="assigned to me", assignee_user=me)
    f.make_action_item(db_session, None, text="created by me", created_by=me)
    f.make_action_item(db_session, m, text="stranger's", assignee=stranger)
    f.make_action_item(db_session, m, text="other's", assignee=other_linked)
    f.make_action_item(db_session, None, text="for other", assignee_user=other, created_by=other)
    f.make_action_item(db_session, m, text="nobody's")
    db_session.commit()
    svc = _svc(uow)
    assert sorted(_texts(svc, scope="mine")) == [
        "assigned to me",
        "created by me",
        "via participant",
    ]
    assert len(_texts(svc, scope="all")) == 7


def test_list_skips_items_of_deleted_meetings_but_keeps_standalone(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    gone = f.make_meeting(db_session, host=user, title="Gone")
    f.make_action_item(db_session, m, text="live")
    f.make_action_item(db_session, gone, text="hidden")
    f.make_action_item(db_session, None, text="standalone")
    uow.meetings.soft_delete(gone)
    db_session.commit()
    page = _svc(uow).list_tasks(TaskFilters(), PageParams())
    by_text = {i.text: i for i in page.items}
    assert set(by_text) == {"live", "standalone"}
    assert by_text["live"].meeting is not None and by_text["live"].meeting.title == "Weekly sync"
    assert by_text["standalone"].meeting is None and by_text["standalone"].meeting_id is None


def test_status_and_text_filters(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    f.make_action_item(db_session, m, text="Send deck")
    f.make_action_item(db_session, m, text="Send invoice", status=ActionItemStatus.COMPLETED)
    f.make_action_item(db_session, m, text="Book 100% room")
    db_session.commit()
    svc = _svc(uow)
    assert _texts(svc, status="completed") == ["Send invoice"]
    assert sorted(_texts(svc, q=" send ")) == ["Send deck", "Send invoice"]
    assert _texts(svc, q="100%") == ["Book 100% room"]  # LIKE wildcards are literal


@pytest.mark.parametrize(
    ("tz", "expected"),
    [
        # In UTC it is still Oct 8: Oct 8 is today, Oct 14 ends the week.
        (
            "UTC",
            {"overdue": ["Oct 7"], "today": ["Oct 8"], "week": ["Oct 9", "Oct 14"],
             "later": ["Oct 15"], "none": ["no date"]},
        ),
        # In India it is already Oct 9, so everything shifts by a day.
        (
            "Asia/Kolkata",
            {"overdue": ["Oct 7", "Oct 8"], "today": ["Oct 9"], "week": ["Oct 14", "Oct 15"],
             "later": [], "none": ["no date"]},
        ),
    ],
)  # fmt: skip
def test_due_buckets_follow_the_local_day(
    db_session: Session, tz: str, expected: dict[str, list[str]]
) -> None:
    uow, _, m = seeded(db_session)
    for day in (7, 8, 9, 14, 15):
        f.make_action_item(db_session, m, text=f"Oct {day}", due_date=date(2026, 10, day))
    f.make_action_item(db_session, m, text="no date")
    db_session.commit()
    svc = _svc(uow)
    for due, texts in expected.items():
        assert _texts(svc, due=due, tz=tz) == texts, due


def test_list_orders_by_due_date_with_undated_last(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    f.make_action_item(db_session, m, text="undated")
    f.make_action_item(db_session, m, text="late", due_date=date(2026, 12, 1))
    f.make_action_item(db_session, m, text="soon", due_date=date(2026, 10, 9))
    db_session.commit()
    assert _texts(_svc(uow)) == ["soon", "late", "undated"]


def test_unknown_tz_is_422(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    with pytest.raises(ValidationFailedError) as err:
        _texts(_svc(uow), tz="Mars/Olympus")
    assert err.value.code == "INVALID_TIMEZONE"


def test_create_standalone_task(db_session: Session) -> None:
    uow, me, _ = seeded(db_session)
    svc = _svc(uow)
    task = svc.create_task(
        TaskCreate(text=" Draft plan ", due_date=date(2026, 10, 9), assignee_user_id=me.id)
    )
    assert task.meeting_id is None and task.meeting is None
    assert task.text == "Draft plan" and task.source == ActionItemSource.MANUAL
    assert task.assignee_user is not None and task.assignee_user.name == me.name
    assert task.status == ActionItemStatus.OPEN
    row = uow.action_items.get(task.id)
    assert row is not None and row.created_by_user_id == me.id
    assert "Draft plan" in _texts(svc, scope="mine")


def test_create_task_on_meeting_validates_assignee(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    alice = f.make_participant(db_session, m, "Alice")
    other = f.make_meeting(db_session, host=user)
    bob = f.make_participant(db_session, other, "Bob")
    db_session.commit()
    svc = _svc(uow)
    task = svc.create_task(TaskCreate(text="x", meeting_id=m.id, assignee_participant_id=alice.id))
    assert task.meeting is not None and task.meeting.id == m.id
    assert task.assignee is not None and task.assignee.display_name == "Alice"
    with pytest.raises(ValidationFailedError) as err:
        svc.create_task(TaskCreate(text="x", meeting_id=m.id, assignee_participant_id=bob.id))
    assert err.value.code == "ASSIGNEE_NOT_IN_MEETING"
    with pytest.raises(ValidationFailedError) as err:
        svc.create_task(TaskCreate(text="x", assignee_participant_id=alice.id))
    assert err.value.code == "ASSIGNEE_NOT_IN_MEETING"
    with pytest.raises(ValidationFailedError) as err:
        svc.create_task(TaskCreate(text="x", assignee_user_id=9999))
    assert err.value.code == "ASSIGNEE_USER_NOT_FOUND"


def test_create_task_on_deleted_meeting_is_gone(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    uow.meetings.soft_delete(m)
    db_session.commit()
    with pytest.raises(GoneError):
        _svc(uow).create_task(TaskCreate(text="x", meeting_id=m.id))


def test_standalone_task_update_and_delete(db_session: Session) -> None:
    uow, me, _ = seeded(db_session)
    svc = _svc(uow)
    task = svc.create_task(TaskCreate(text="Solo"))
    out = svc.update(task.id, ActionItemUpdate(assignee_user_id=me.id, text="Solo 2"))
    assert out.assignee_user is not None and out.text == "Solo 2"
    out = svc.update(task.id, ActionItemUpdate(assignee_user_id=None))
    assert out.assignee_user is None
    with pytest.raises(ValidationFailedError):
        svc.update(task.id, ActionItemUpdate(assignee_participant_id=1))
    done = svc.update(task.id, ActionItemUpdate(status=ActionItemStatus.COMPLETED))
    assert done.completed_at is not None
    svc.delete(task.id)
    assert uow.action_items.get(task.id) is None


def test_tasks_api_round_trip(api: TestClient) -> None:
    created = api.post("/api/v1/action-items", json={"text": "Ship it", "due_date": "2026-10-09"})
    assert created.status_code == 201
    body = created.json()
    assert body["meeting"] is None and body["meeting_id"] is None
    mine = api.get("/api/v1/action-items", params={"scope": "mine"}).json()
    assert [i["id"] for i in mine["items"]] == [body["id"]]
    assert set(mine) >= {"items", "page", "page_size", "total", "total_pages", "has_next"}
    done = api.patch(f"/api/v1/action-items/{body['id']}", json={"status": "completed"})
    assert done.status_code == 200
    open_only = api.get("/api/v1/action-items", params={"status": "open"}).json()
    assert open_only["total"] == 0
    assert api.delete(f"/api/v1/action-items/{body['id']}").status_code == 204


@pytest.mark.parametrize(
    ("params", "code"),
    [
        ({"scope": "everyone"}, "VALIDATION_ERROR"),
        ({"due": "someday"}, "VALIDATION_ERROR"),
        ({"tz": "Nowhere/City"}, "INVALID_TIMEZONE"),
    ],
)
def test_tasks_api_rejects_bad_filters(api: TestClient, params: dict[str, str], code: str) -> None:
    res = api.get("/api/v1/action-items", params=params)
    assert res.status_code == 422 and res.json()["error"]["code"] == code


@pytest.mark.parametrize(
    "body",
    [{"text": ""}, {"text": "x", "extra": 1}, {"text": "x", "meeting_id": "abc"}, {}],
)
def test_create_task_validation(api: TestClient, body: dict[str, Any]) -> None:
    assert api.post("/api/v1/action-items", json=body).status_code == 422


def test_create_task_unknown_meeting_is_404(api: TestClient) -> None:
    res = api.post("/api/v1/action-items", json={"text": "x", "meeting_id": 9999})
    assert res.status_code == 404 and res.json()["error"]["code"] == "MEETING_NOT_FOUND"
