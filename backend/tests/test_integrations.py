import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ServiceUnavailableError
from app.integrations import CATALOG, CATEGORY_LABELS, IntegrationCategory
from app.schemas.common import PageParams
from app.schemas.integration import IntegrationFilters
from app.services.integrations import IntegrationService
from tests import factories as f
from tests.service_helpers import make_uow

V1 = "/api/v1"
ALL = PageParams(page_size=100)


def _service(db: Session) -> IntegrationService:
    f.make_user(db)
    db.commit()
    return IntegrationService(make_uow(db))


def _keys(svc: IntegrationService, **filters: object) -> list[str]:
    page = svc.list(IntegrationFilters(**filters), ALL)  # type: ignore[arg-type]
    return [i.key for i in page.items]


def test_catalogue_is_well_formed() -> None:
    keys = [e.key for e in CATALOG]
    assert len(keys) == len(set(keys)) >= 24
    assert {e.category for e in CATALOG} == set(IntegrationCategory)
    assert set(CATEGORY_LABELS) == set(IntegrationCategory)
    assert [e.name.lower() for e in CATALOG] == sorted(e.name.lower() for e in CATALOG)
    assert {"zoom", "slack", "salesforce", "meeting-mcp", "linear"} <= set(keys)


def test_filters_by_category_and_search(db_session: Session) -> None:
    svc = _service(db_session)
    assert _keys(svc, category=IntegrationCategory.CRM) == ["hubspot", "pipedrive", "salesforce"]
    # Name, vendor and description all match, ignoring case and surrounding space.
    assert _keys(svc, q="  SLACK ") == ["slack"]
    assert set(_keys(svc, q="atlassian")) == {"jira", "trello"}
    assert "notion" in _keys(svc, q="workspace and database")
    assert _keys(svc, category=IntegrationCategory.CRM, q="PIPEDRIVE") == ["pipedrive"]
    assert _keys(svc, q="no such tool") == []
    assert len(_keys(svc)) == len(CATALOG)


def test_list_pages_the_filtered_catalogue(db_session: Session) -> None:
    svc = _service(db_session)
    first = svc.list(IntegrationFilters(), PageParams(page=1, page_size=10))
    last = svc.list(IntegrationFilters(), PageParams(page=3, page_size=10))
    assert first.total == len(CATALOG) and first.has_next
    assert len(first.items) == 10 and len(last.items) == len(CATALOG) - 20
    assert not last.has_next


def test_connect_is_idempotent_and_merges_into_the_list(db_session: Session) -> None:
    svc = _service(db_session)
    first = svc.connect("slack")
    assert first.connected and first.connected_at is not None
    again = svc.connect("slack")
    assert again.connected_at == first.connected_at
    assert _keys(svc, connected=True) == ["slack"]
    assert "slack" not in _keys(svc, connected=False)
    slack = next(i for i in svc.list(IntegrationFilters(q="slack"), ALL).items if i.key == "slack")
    assert slack.connected and slack.connected_at == first.connected_at


def test_disconnect_removes_and_is_idempotent(db_session: Session) -> None:
    svc = _service(db_session)
    svc.connect("zoom")
    svc.disconnect("zoom")
    svc.disconnect("zoom")
    assert _keys(svc, connected=True) == []


def test_unknown_key_is_not_found(db_session: Session) -> None:
    svc = _service(db_session)
    for action in (svc.connect, svc.disconnect):
        with pytest.raises(NotFoundError) as err:
            action("myspace")
        assert err.value.code == "INTEGRATION_NOT_FOUND"


def test_unseeded_database_is_unavailable(db_session: Session) -> None:
    with pytest.raises(ServiceUnavailableError):
        IntegrationService(make_uow(db_session)).connect("slack")


def test_categories_count_the_catalogue(db_session: Session) -> None:
    page = _service(db_session).categories(PageParams())
    counts = {c.key: c.count for c in page.items}
    assert page.total == len(IntegrationCategory)
    assert counts[IntegrationCategory.CRM] == 3
    assert sum(counts.values()) == len(CATALOG)
    assert [c.label for c in page.items][:4] == [
        "Audio recording",
        "Applicant tracking system",
        "CRM",
        "MCP",
    ]


def test_integrations_api_flow(api: TestClient) -> None:
    crm = api.get(f"{V1}/integrations", params={"category": "crm"}).json()
    assert [i["key"] for i in crm["items"]] == ["hubspot", "pipedrive", "salesforce"]
    assert set(crm) >= {"items", "page", "page_size", "total", "total_pages", "has_next"}
    assert api.get(f"{V1}/integrations", params={"category": "fax"}).status_code == 422

    put = api.put(f"{V1}/integrations/slack/connection")
    assert put.status_code == 200
    assert put.json()["connected"] is True and put.json()["key"] == "slack"
    assert api.put(f"{V1}/integrations/slack/connection").json() == put.json()

    connected = api.get(f"{V1}/integrations", params={"connected": "true"}).json()
    assert [i["key"] for i in connected["items"]] == ["slack"]

    r = api.delete(f"{V1}/integrations/slack/connection")
    assert r.status_code == 204 and r.content == b""
    assert api.get(f"{V1}/integrations", params={"connected": "true"}).json()["total"] == 0

    missing = api.put(f"{V1}/integrations/myspace/connection")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "INTEGRATION_NOT_FOUND"
    assert api.delete(f"{V1}/integrations/myspace/connection").status_code == 404

    cats = api.get(f"{V1}/integrations/categories").json()
    assert cats["total"] == len(IntegrationCategory)
    assert {"key": "crm", "label": "CRM", "count": 3} in cats["items"]
