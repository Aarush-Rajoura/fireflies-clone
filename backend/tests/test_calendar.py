"""Simulated calendar connections: idempotent connect, scoped disconnect."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Meeting
from app.models.enums import CalendarProvider, MeetingSource, MeetingStatus
from app.schemas.home import CalendarConnectionCreate
from app.services.calendar import DEMO_LABEL, CalendarService
from app.services.notifications import NotificationService
from tests.service_helpers import seeded

V1 = "/api/v1"


def _upcoming(api: TestClient) -> list[dict[str, object]]:
    r = api.get(f"{V1}/meetings", params={"status": "upcoming", "sort": "started_at"})
    assert r.status_code == 200
    return r.json()["items"]  # type: ignore[no-any-return]


def test_connect_imports_three_labelled_upcoming_meetings(api: TestClient) -> None:
    r = api.post(f"{V1}/calendar-connections", json={"provider": "google"})
    assert r.status_code == 201, r.text
    assert r.json()["provider"] == "google"

    upcoming = _upcoming(api)
    assert len(upcoming) == 3
    assert all(m["auto_join"] and m["meeting_url"] for m in upcoming)
    detail = api.get(f"{V1}/meetings/{upcoming[0]['id']}").json()
    assert detail["source"] == "calendar"
    assert DEMO_LABEL in detail["description"]

    listed = api.get(f"{V1}/calendar-connections").json()
    assert listed["total"] == 1 and listed["items"][0]["provider"] == "google"


def test_connect_is_idempotent(api: TestClient) -> None:
    first = api.post(f"{V1}/calendar-connections", json={"provider": "outlook"})
    again = api.post(f"{V1}/calendar-connections", json={"provider": "outlook"})
    assert first.status_code == 201 and again.status_code == 200
    assert again.json() == first.json()
    assert len(_upcoming(api)) == 3
    assert api.get(f"{V1}/calendar-connections").json()["total"] == 1


def test_disconnect_removes_only_that_providers_imports(api: TestClient) -> None:
    api.post(f"{V1}/calendar-connections", json={"provider": "google"})
    google_ids = {m["id"] for m in _upcoming(api)}
    api.post(f"{V1}/calendar-connections", json={"provider": "outlook"})
    manual = api.post(
        f"{V1}/meetings",
        json={
            "title": "My own meeting",
            "status": "scheduled",
            "started_at": (datetime.now(UTC) + timedelta(days=2)).isoformat(),
        },
    ).json()
    assert len(_upcoming(api)) == 7

    r = api.delete(f"{V1}/calendar-connections/google")
    assert r.status_code == 204 and r.content == b""

    remaining = _upcoming(api)
    assert len(remaining) == 4
    assert manual["id"] in {m["id"] for m in remaining}
    providers = api.get(f"{V1}/calendar-connections").json()["items"]
    assert [c["provider"] for c in providers] == ["outlook"]

    assert not google_ids & {m["id"] for m in remaining}
    # Imported rows are soft-deleted (restorable), not destroyed.
    for mid in google_ids:
        assert api.get(f"{V1}/meetings/{mid}").status_code == 410


def test_disconnect_unknown_is_404_and_bad_provider_is_422(api: TestClient) -> None:
    r = api.delete(f"{V1}/calendar-connections/google")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "CALENDAR_NOT_CONNECTED"
    assert api.delete(f"{V1}/calendar-connections/yahoo").status_code == 422
    assert api.post(f"{V1}/calendar-connections", json={"provider": "yahoo"}).status_code == 422


def test_reconnect_after_disconnect_imports_fresh_samples(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    service = CalendarService(uow, NotificationService(uow))
    data = CalendarConnectionCreate(provider=CalendarProvider.GOOGLE)
    now = datetime(2026, 10, 8, 23, 59, tzinfo=UTC)

    assert service.connect(data, now=now).created is True
    service.disconnect(CalendarProvider.GOOGLE)
    assert service.connect(data, now=now).created is True

    rows = db_session.scalars(select(Meeting).where(Meeting.source == MeetingSource.CALENDAR)).all()
    live = [m for m in rows if m.deleted_at is None]
    assert len(rows) == 6 and len(live) == 3
    assert all(m.status == MeetingStatus.SCHEDULED and m.started_at > now for m in live)
    assert all(m.host_id == user.id for m in live)
