"""Scheduling (status=scheduled) and Capture (status=live) through POST /meetings."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationFailedError
from app.models.enums import MeetingSource, MeetingStatus, Platform
from app.parsers import default_registry
from app.schemas.meeting import MeetingCreate
from app.schemas.transcript import SegmentIn
from app.services.meeting_creation import MeetingCreationService
from app.services.summary import SummaryService
from tests.ai_stubs import StubExtractor, StubSummarizer
from tests.service_helpers import seeded

V1 = "/api/v1"
NOW = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)
SEGMENT = SegmentIn(speaker="A", start_ms=0, end_ms=10, text="hello")


def _service(db: Session) -> MeetingCreationService:
    uow, _, _ = seeded(db)
    summ = StubSummarizer()
    return MeetingCreationService(
        uow,
        default_registry(),
        summ,
        StubExtractor(),
        SummaryService(uow, summ),
        clock=lambda: NOW,
    )


def _future(hours: int = 2) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def test_scheduled_meeting_stores_link_and_detects_platform(db_session: Session) -> None:
    detail = _service(db_session).create(
        MeetingCreate(
            title="Design review",
            status="scheduled",
            started_at=NOW + timedelta(days=1),
            meeting_url="https://us02web.zoom.us/j/42",
            auto_join=True,
        )
    )
    assert detail.status == MeetingStatus.SCHEDULED
    assert detail.source == MeetingSource.MANUAL
    assert detail.platform == Platform.ZOOM
    assert detail.meeting_url == "https://us02web.zoom.us/j/42"
    assert detail.auto_join is True
    assert detail.started_at == NOW + timedelta(days=1)


def test_explicit_platform_wins_over_detection(db_session: Session) -> None:
    detail = _service(db_session).create(
        MeetingCreate(
            title="x",
            status="scheduled",
            started_at=NOW + timedelta(hours=1),
            meeting_url="https://zoom.us/j/1",
            platform=Platform.OTHER,
        )
    )
    assert detail.platform == Platform.OTHER


@pytest.mark.parametrize("delta", [timedelta(0), timedelta(minutes=-5)])
def test_scheduled_meeting_must_start_in_the_future(db_session: Session, delta: timedelta) -> None:
    with pytest.raises(ValidationFailedError) as err:
        _service(db_session).create(
            MeetingCreate(title="Late", status="scheduled", started_at=NOW + delta)
        )
    assert err.value.code == "SCHEDULED_IN_PAST"


def test_live_capture_starts_now_with_capture_source(db_session: Session) -> None:
    detail = _service(db_session).create(
        MeetingCreate(
            title="Standup",
            status="live",
            meeting_url="https://meet.google.com/abc-defg-hij",
            language="ES",
            started_at=NOW - timedelta(days=3),  # ignored: a capture starts now
        )
    )
    assert detail.status == MeetingStatus.LIVE
    assert detail.source == MeetingSource.CAPTURE
    assert detail.started_at == NOW
    assert detail.platform == Platform.MEET
    assert detail.language == "es"


@pytest.mark.parametrize(
    "body",
    [
        {"status": "scheduled"},  # no started_at
        {"status": "scheduled", "started_at": NOW, "segments": [SEGMENT]},
        {"status": "live"},  # no link
        {"status": "live", "meeting_url": "https://zoom.us/j/1", "segments": [SEGMENT]},
        {"meeting_url": "https://zoom.us/j/1"},  # link without a status
        {"auto_join": True},
        {"status": "live", "meeting_url": "zoom.us/j/1"},  # no scheme
        {"status": "completed"},  # not creatable
        {"status": "scheduled", "started_at": NOW, "source": "calendar"},  # server-only
    ],
)
def test_schema_rejects_inconsistent_status_bodies(body: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        MeetingCreate(title="x", **body)


def test_api_schedule_appears_in_upcoming_and_past_is_422(api: TestClient) -> None:
    r = api.post(
        f"{V1}/meetings",
        json={
            "title": "Planning",
            "status": "scheduled",
            "started_at": _future(),
            "meeting_url": "https://teams.microsoft.com/l/meetup-join/1",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["platform"] == "teams" and r.json()["status"] == "scheduled"
    upcoming = api.get(f"{V1}/meetings", params={"status": "upcoming"}).json()
    assert [m["title"] for m in upcoming["items"]] == ["Planning"]
    # Scheduled meetings are not "completed" ones.
    assert api.get(f"{V1}/meetings").json()["total"] == 0

    past = api.post(
        f"{V1}/meetings",
        json={"title": "Old", "status": "scheduled", "started_at": _future(-1)},
    )
    assert past.status_code == 422
    assert past.json()["error"]["code"] == "SCHEDULED_IN_PAST"


def test_api_capture_returns_live_meeting(api: TestClient) -> None:
    r = api.post(
        f"{V1}/meetings",
        json={"title": "Capture", "status": "live", "meeting_url": "https://zoom.us/j/9"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "live" and body["source"] == "capture"
    assert body["platform"] == "zoom"
    # A live capture is in the library (so it can be reopened), not in Upcoming.
    assert api.get(f"{V1}/meetings", params={"status": "upcoming"}).json()["total"] == 0
    library = api.get(f"{V1}/meetings").json()["items"]
    assert [m["id"] for m in library] == [body["id"]]


def test_plain_create_path_is_unchanged(api: TestClient) -> None:
    r = api.post(f"{V1}/meetings", json={"title": "Notes", "source": "paste"})
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "completed" and body["source"] == "paste"
    assert body["meeting_url"] is None and body["platform"] is None
    assert body["auto_join"] is False and body["language"] == "en"
