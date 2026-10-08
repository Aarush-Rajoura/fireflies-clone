from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, GoneError, NotFoundError, ValidationFailedError
from app.models import Keyword
from app.schemas.common import PageParams
from app.schemas.tag import MeetingTagsUpdate, TagCreate, TagUpdate
from app.services.tags import TagService
from tests import factories as f
from tests.service_helpers import seeded

V1 = "/api/v1"


def test_names_are_unique_ignoring_case(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    svc = TagService(uow)
    sales = svc.create(TagCreate(name="  Sales "))
    assert sales.name == "Sales"
    with pytest.raises(ConflictError) as err:
        svc.create(TagCreate(name="SALES"))
    assert err.value.code == "TAG_EXISTS"
    other = svc.create(TagCreate(name="Hiring", color_index=3))
    with pytest.raises(ConflictError):
        svc.update(other.id, TagUpdate(name="sales"))
    # Re-casing your own name is not a clash.
    assert svc.update(sales.id, TagUpdate(name="sales")).name == "sales"
    assert [t.name for t in svc.list(PageParams()).items] == ["Hiring", "sales"]


def test_replace_set_dedupes_and_rejects_unknown_ids(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    svc = TagService(uow)
    a, b = svc.create(TagCreate(name="A")), svc.create(TagCreate(name="B"))
    detail = svc.set_for_meeting(m.id, MeetingTagsUpdate(tag_ids=[a.id, b.id, a.id]))
    assert [t.id for t in detail.tags] == [a.id, b.id]
    assert [t.id for t in svc.set_for_meeting(m.id, MeetingTagsUpdate(tag_ids=[b.id])).tags] == [
        b.id
    ]
    with pytest.raises(ValidationFailedError) as err:
        svc.set_for_meeting(m.id, MeetingTagsUpdate(tag_ids=[b.id, 999]))
    assert err.value.code == "TAG_NOT_FOUND" and err.value.details == {"tag_ids": [999]}
    assert svc.set_for_meeting(m.id, MeetingTagsUpdate(tag_ids=[])).tags == []


def test_deleted_meeting_is_410_and_unknown_tag_404(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    gone = f.make_meeting(db_session, host=user, deleted_at=datetime.now(UTC))
    db_session.commit()
    svc = TagService(uow)
    with pytest.raises(GoneError):
        svc.set_for_meeting(gone.id, MeetingTagsUpdate(tag_ids=[]))
    with pytest.raises(NotFoundError) as err:
        svc.delete(12345)
    assert err.value.code == "TAG_NOT_FOUND"


def test_suggested_tags_skip_applied_ones(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    db_session.add_all(
        [
            Keyword(meeting_id=m.id, term="Pricing", weight=0.9),
            Keyword(meeting_id=m.id, term="Roadmap", weight=0.5),
        ]
    )
    db_session.commit()
    svc = TagService(uow)
    pricing = svc.create(TagCreate(name="pricing"))
    detail = svc.set_for_meeting(m.id, MeetingTagsUpdate(tag_ids=[pricing.id]))
    assert detail.suggested_tags == ["Roadmap"]


def _meeting(api: TestClient, title: str = "Sync") -> int:
    r = api.post(f"{V1}/meetings", json={"title": title})
    assert r.status_code == 201, r.text
    return int(r.json()["id"])


def test_tags_api_flow_filter_and_delete_unlinks(api: TestClient) -> None:
    tagged, other = _meeting(api, "Tagged"), _meeting(api, "Other")
    tag = api.post(f"{V1}/tags", json={"name": "Sales"})
    assert tag.status_code == 201
    tid = tag.json()["id"]
    assert api.post(f"{V1}/tags", json={"name": "sales"}).json()["error"]["code"] == "TAG_EXISTS"
    listed = api.get(f"{V1}/tags").json()
    assert listed["total"] == 1 and set(listed) >= {"items", "has_next"}

    put = api.put(f"{V1}/meetings/{tagged}/tags", json={"tag_ids": [tid]})
    assert put.status_code == 200 and [t["name"] for t in put.json()["tags"]] == ["Sales"]
    bad = api.put(f"{V1}/meetings/{tagged}/tags", json={"tag_ids": [tid, 999]})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "TAG_NOT_FOUND"

    hits = api.get(f"{V1}/meetings", params={"tag": tid}).json()["items"]
    assert [m["id"] for m in hits] == [tagged]
    assert other not in [m["id"] for m in hits]

    renamed = api.patch(f"{V1}/tags/{tid}", json={"name": "Deals", "color_index": 2})
    assert renamed.json() == {"id": tid, "name": "Deals", "color_index": 2}
    assert api.patch(f"{V1}/tags/{tid}", json={"color_index": 9}).status_code == 422

    r = api.delete(f"{V1}/tags/{tid}")
    assert r.status_code == 204 and r.content == b""
    assert api.get(f"{V1}/meetings/{tagged}").json()["tags"] == []
    assert api.get(f"{V1}/meetings", params={"tag": tid}).json()["total"] == 0
    assert api.delete(f"{V1}/tags/{tid}").status_code == 404
