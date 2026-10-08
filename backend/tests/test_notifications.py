"""Notifications: written as side effects, listed unread first, marked read."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Notification
from app.models.enums import NotificationKind
from app.schemas.common import PageParams
from app.services.notifications import NotificationService
from tests.service_helpers import seeded

V1 = "/api/v1"
VTT = "WEBVTT\n\n00:00.000 --> 00:03.000\n<v Alice>Let's plan the launch\n"


def _list(api: TestClient) -> list[dict[str, object]]:
    r = api.get(f"{V1}/notifications")
    assert r.status_code == 200
    return r.json()["items"]  # type: ignore[no-any-return]


def test_use_cases_write_notifications(api: TestClient) -> None:
    preview = api.post(f"{V1}/transcript-previews/files", files={"file": ("m.vtt", VTT)}).json()
    mid = api.post(
        f"{V1}/meetings", json={"title": "Launch", "segments": preview["segments"]}
    ).json()["id"]
    api.post(f"{V1}/calendar-connections", json={"provider": "google"})
    api.post(f"{V1}/meetings/{mid}/summary/regenerate")

    items = _list(api)
    assert [i["kind"] for i in items] == [
        "summary_regenerated",
        "calendar_connected",
        "meeting_created",
    ]
    assert items[2]["link"] == f"/meetings/{mid}" and items[2]["title"] == "Launch is ready"
    assert all(i["read_at"] is None for i in items)


def test_capture_notifies_but_schedule_and_repeat_connect_do_not(api: TestClient) -> None:
    cap = api.post(
        f"{V1}/meetings",
        json={"title": "Cap", "status": "live", "meeting_url": "https://zoom.us/j/1"},
    ).json()
    api.post(
        f"{V1}/meetings",
        json={"title": "Later", "status": "scheduled", "started_at": "2999-01-01T10:00:00Z"},
    )
    # A repeat connect imports nothing, so it does not notify again either.
    api.post(f"{V1}/calendar-connections", json={"provider": "outlook"})
    api.post(f"{V1}/calendar-connections", json={"provider": "outlook"})
    items = _list(api)
    assert [i["kind"] for i in items] == ["calendar_connected", "meeting_captured"]
    assert items[1]["title"] == "Fred is joining Cap (demo)"
    assert items[1]["link"] == f"/meetings/{cap['id']}"


def _kinds(api: TestClient, kind: str) -> list[dict[str, object]]:
    return [i for i in _list(api) if i["kind"] == kind]


def test_action_item_assigned_to_me_notifies_once(api: TestClient) -> None:
    mid = api.post(f"{V1}/meetings", json={"title": "Sync", "participants": ["Bob"]}).json()["id"]
    people = api.get(f"{V1}/meetings/{mid}").json()["participants"]
    me = next(p["id"] for p in people if p["user_id"] is not None)
    bob = next(p["id"] for p in people if p["display_name"] == "Bob")
    items = f"{V1}/meetings/{mid}/action-items"

    api.post(items, json={"text": "Bob's task", "assignee_participant_id": bob})
    api.post(items, json={"text": "Unassigned"})
    assert _kinds(api, "action_item_assigned") == []

    mine = api.post(items, json={"text": "Send the deck", "assignee_participant_id": me}).json()
    got = _kinds(api, "action_item_assigned")
    assert [(n["title"], n["body"]) for n in got] == [
        ("New action item for you in Sync", "Send the deck")
    ]

    # Editing it without changing the assignee does not ring again.
    api.patch(f"{V1}/action-items/{mine['id']}", json={"text": "Send the final deck"})
    assert len(_kinds(api, "action_item_assigned")) == 1

    # Re-assigning someone else's item to me does.
    bobs = next(i for i in api.get(items).json()["items"] if i["text"] == "Bob's task")
    api.patch(f"{V1}/action-items/{bobs['id']}", json={"assignee_participant_id": me})
    assert len(_kinds(api, "action_item_assigned")) == 2


def test_invite_accepted_hook(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    service = NotificationService(uow)
    service.notify_invite_accepted("Grace Hopper", "grace@example.com")
    service.notify_invite_accepted("Alan")
    rows = service.list(PageParams()).items
    assert [(n.kind, n.title, n.body, n.link) for n in rows] == [
        (
            NotificationKind.INVITE_ACCEPTED,
            "Alan joined your team",
            "Alan accepted your invite (demo).",
            "/team",
        ),
        (
            NotificationKind.INVITE_ACCEPTED,
            "Grace Hopper joined your team",
            "Grace Hopper (grace@example.com) accepted your invite (demo).",
            "/team",
        ),
    ]


def test_mark_read_unread_and_read_all(api: TestClient) -> None:
    for title in ("One", "Two", "Three"):
        api.post(f"{V1}/meetings", json={"title": title})
    three, two, one = _list(api)

    r = api.patch(f"{V1}/notifications/{three['id']}", json={"read": True})
    assert r.status_code == 200 and r.json()["read_at"] is not None
    # Unread first: the read one sinks below the others.
    assert [i["id"] for i in _list(api)] == [two["id"], one["id"], three["id"]]

    first_read = r.json()["read_at"]
    again = api.patch(f"{V1}/notifications/{three['id']}", json={"read": True}).json()
    assert again["read_at"] == first_read  # re-marking keeps the original time

    unread = api.patch(f"{V1}/notifications/{three['id']}", json={"read": False}).json()
    assert unread["read_at"] is None

    r = api.post(f"{V1}/notifications/read-all")
    assert r.status_code == 204 and r.content == b""
    assert all(i["read_at"] is not None for i in _list(api))


def test_patch_errors(api: TestClient) -> None:
    r = api.patch(f"{V1}/notifications/999", json={"read": True})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOTIFICATION_NOT_FOUND"
    api.post(f"{V1}/meetings", json={"title": "x"})
    nid = _list(api)[0]["id"]
    assert api.patch(f"{V1}/notifications/{nid}", json={"seen": True}).status_code == 422


def test_record_never_raises_and_leaves_no_partial_row(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    uow, _, _ = seeded(db_session)
    service = NotificationService(uow)

    def boom(_: Notification) -> Notification:
        raise RuntimeError("disk full")

    monkeypatch.setattr(uow.notifications, "add", boom)
    service.record(NotificationKind.MEETING_CREATED, "x")  # must not raise
    monkeypatch.undo()
    assert db_session.scalars(select(Notification)).all() == []


def test_list_orders_unread_then_newest(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    now = datetime(2026, 10, 8, tzinfo=UTC)
    states = [("old-unread", None), ("new-read", now), ("new-unread", None)]
    rows = [
        Notification(
            user_id=user.id,
            kind=NotificationKind.MEETING_CREATED,
            title=title,
            created_at=now + timedelta(minutes=i),
            read_at=read,
        )
        for i, (title, read) in enumerate(states)
    ]
    db_session.add_all(rows)
    db_session.commit()
    page = NotificationService(uow).list(PageParams())
    assert [n.title for n in page.items] == ["new-unread", "old-unread", "new-read"]
