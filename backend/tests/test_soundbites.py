from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import GoneError, NotFoundError, ValidationFailedError
from app.schemas.common import PageParams
from app.schemas.soundbite import SoundbiteCreate
from app.services.soundbites import SoundbiteService
from app.services.timefmt import clock
from tests import factories as f
from tests.service_helpers import seeded

V1 = "/api/v1"


@pytest.mark.parametrize(
    ("start", "end", "code"),
    [
        (0, 2_999, "SOUNDBITE_LENGTH_INVALID"),
        (0, 180_001, "SOUNDBITE_LENGTH_INVALID"),
        (5_000, 5_000, "SOUNDBITE_LENGTH_INVALID"),
        (8_000, 4_000, "SOUNDBITE_LENGTH_INVALID"),
        (590_000, 600_001, "SOUNDBITE_OUT_OF_RANGE"),
    ],
)
def test_bounds_are_422(db_session: Session, start: int, end: int, code: str) -> None:
    uow, user, _ = seeded(db_session)
    m = f.make_meeting(db_session, host=user, duration_ms=600_000)
    db_session.commit()
    with pytest.raises(ValidationFailedError) as err:
        SoundbiteService(uow).create(m.id, SoundbiteCreate(start_ms=start, end_ms=end))
    assert err.value.code == code


def test_create_list_delete_and_default_title(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    m = f.make_meeting(db_session, host=user, duration_ms=600_000)
    speaker = f.make_speaker(db_session, m)
    f.make_segment(db_session, m, speaker, "Opening words", sequence=0)
    f.make_segment(db_session, m, speaker, "We agreed to ship on Friday", sequence=5)
    db_session.commit()
    svc = SoundbiteService(uow)
    exact = svc.create(m.id, SoundbiteCreate(title="Pricing", start_ms=0, end_ms=3_000))
    longest = svc.create(m.id, SoundbiteCreate(start_ms=420_000, end_ms=600_000))
    spoken = svc.create(m.id, SoundbiteCreate(start_ms=5_000, end_ms=9_000))
    assert exact.title == "Pricing" and exact.duration_ms == 3_000
    assert longest.title == "Soundbite at 07:00"
    assert spoken.title == "We agreed to ship on Friday"
    page = svc.list(m.id, PageParams())
    assert [s.id for s in page.items] == [exact.id, spoken.id, longest.id]
    svc.delete(exact.id)
    with pytest.raises(NotFoundError):
        svc.delete(exact.id)
    m.deleted_at = datetime.now(UTC)
    db_session.commit()
    with pytest.raises(GoneError):
        svc.delete(spoken.id)


def test_default_title_uses_the_shared_clock_past_the_hour(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    m = f.make_meeting(db_session, host=user, duration_ms=4_000_000)
    db_session.commit()
    bite = SoundbiteService(uow).create(m.id, SoundbiteCreate(start_ms=3_605_000, end_ms=3_610_000))
    assert bite.title == "Soundbite at 1:00:05"
    assert clock(65_000) == "01:05"


def test_soundbites_api_contract(api: TestClient) -> None:
    body = {
        "title": "Sync",
        "segments": [{"speaker": "Ann", "start_ms": 0, "end_ms": 10_000, "text": "Hello team"}],
    }
    mid = api.post(f"{V1}/meetings", json=body).json()["id"]
    url = f"{V1}/meetings/{mid}/soundbites"
    created = api.post(url, json={"start_ms": 1_000, "end_ms": 5_000})
    assert created.status_code == 201, created.text
    assert created.json()["title"] == "Hello team"
    short = api.post(url, json={"start_ms": 0, "end_ms": 1_000})
    assert short.status_code == 422 and short.json()["error"]["code"] == "SOUNDBITE_LENGTH_INVALID"
    late = api.post(url, json={"start_ms": 5_000, "end_ms": 12_000})
    assert late.status_code == 422 and late.json()["error"]["code"] == "SOUNDBITE_OUT_OF_RANGE"
    assert api.post(url, json={"start_ms": -1, "end_ms": 4_000}).status_code == 422
    listed = api.get(url).json()
    assert listed["total"] == 1 and "total_pages" in listed
    r = api.delete(f"{V1}/soundbites/{created.json()['id']}")
    assert r.status_code == 204 and r.content == b""
    assert api.delete(f"{V1}/soundbites/{created.json()['id']}").status_code == 404
