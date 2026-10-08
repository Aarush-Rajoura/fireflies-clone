from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationFailedError
from app.schemas.common import PageParams
from app.schemas.meeting_filters import MeetingFilters, MeetingSort
from app.services.meetings import MeetingService
from tests import factories as f
from tests.service_helpers import seeded

OCT_9 = date(2026, 10, 9)


def _ids(svc: MeetingService, **filters: object) -> list[int]:
    page = svc.list(MeetingFilters(**filters), PageParams(), MeetingSort.NEWEST)  # type: ignore[arg-type]
    return [m.id for m in page.items]


def test_date_filters_are_whole_local_days_in_tz(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    # 20:00Z on Oct 8 is 01:30 on Oct 9 in India (UTC+5:30).
    evening = f.make_meeting(
        db_session, host=user, started_at=datetime(2026, 10, 8, 20, 0, tzinfo=UTC)
    )
    db_session.commit()
    svc = MeetingService(uow)
    assert evening.id in _ids(svc, date_from=OCT_9, date_to=OCT_9, tz="Asia/Kolkata")
    assert evening.id not in _ids(svc, date_from=OCT_9, date_to=OCT_9)  # UTC by default
    assert evening.id in _ids(svc, date_from=date(2026, 10, 8), date_to=date(2026, 10, 8))
    assert evening.id not in _ids(
        svc, date_from=date(2026, 10, 8), date_to=date(2026, 10, 8), tz="Asia/Kolkata"
    )


@pytest.mark.parametrize("tz", ["Mars/Olympus", "", "../etc/passwd", "utc+5"])
def test_unknown_timezone_is_422(db_session: Session, tz: str) -> None:
    uow, _, _ = seeded(db_session)
    with pytest.raises(ValidationFailedError) as err:
        _ids(MeetingService(uow), tz=tz)
    assert err.value.code == "INVALID_TIMEZONE"


def test_tz_query_param(api: TestClient) -> None:
    body = {"title": "Late call", "started_at": "2026-10-08T20:00:00Z"}
    mid = api.post("/api/v1/meetings", json=body).json()["id"]
    day = {"date_from": "2026-10-09", "date_to": "2026-10-09"}
    india = api.get("/api/v1/meetings", params={**day, "tz": "Asia/Kolkata"}).json()
    assert [m["id"] for m in india["items"]] == [mid]
    assert api.get("/api/v1/meetings", params=day).json()["total"] == 0
    bad = api.get("/api/v1/meetings", params={"tz": "Nowhere/City"})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "INVALID_TIMEZONE"
