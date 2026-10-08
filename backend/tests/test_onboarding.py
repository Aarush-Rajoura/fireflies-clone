from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from tests import factories as f

V1 = "/api/v1"


def _answers(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "join_preference": "owned",
        "recap_preference": "everyone",
        "role": "Engineering",
        "job_title": "Staff Engineer",
        "tools": ["zoom", "slack"],
        "invite_emails": [],
    }
    return body | overrides


def test_me_starts_without_onboarding(api: TestClient) -> None:
    me = api.get(f"{V1}/me").json()
    assert me["onboarded_at"] is None and me["tools"] == [] and me["role"] is None


def test_onboarding_saves_answers_and_tools(api: TestClient) -> None:
    r = api.put(
        f"{V1}/me/onboarding",
        json=_answers(tools=["Zoom", "slack", "zoom", " notion "], invite_emails=["A@x.io"]),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["tools"] == ["zoom", "slack", "notion"]
    assert body["invites_sent"] == 1 and body["onboarded_at"] is not None
    me = api.get(f"{V1}/me").json()
    assert me["tools"] == ["zoom", "slack", "notion"]
    assert (me["join_preference"], me["recap_preference"]) == ("owned", "everyone")
    assert (me["role"], me["job_title"]) == ("Engineering", "Staff Engineer")


def test_onboarding_replaces_the_tool_set(api: TestClient) -> None:
    api.put(f"{V1}/me/onboarding", json=_answers(tools=["zoom", "slack"]))
    api.put(f"{V1}/me/onboarding", json=_answers(tools=["jira"]))
    assert api.get(f"{V1}/me").json()["tools"] == ["jira"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"join_preference": "sometimes"},
        {"recap_preference": "nobody"},
        {"invite_emails": ["not-an-email"]},
        {"invite_emails": ["a@b"]},
        {"tools": [f"t{i}" for i in range(21)]},
        {"invite_emails": [f"u{i}@x.io" for i in range(21)]},
        {"role": ""},
        {"unexpected": True},
    ],
)
def test_onboarding_rejects_bad_input(api: TestClient, overrides: dict[str, Any]) -> None:
    r = api.put(f"{V1}/me/onboarding", json=_answers(**overrides))
    assert r.status_code == 422
    assert r.json()["error"]["code"]
    assert api.get(f"{V1}/me").json()["onboarded_at"] is None


def test_restart_clears_onboarded_at_but_keeps_answers(api: TestClient) -> None:
    api.put(f"{V1}/me/onboarding", json=_answers())
    r = api.delete(f"{V1}/me/onboarding")
    assert r.status_code == 204 and r.content == b""
    me = api.get(f"{V1}/me").json()
    assert me["onboarded_at"] is None and me["tools"] == ["zoom", "slack"]


def test_patch_me_updates_name_and_job_title(api: TestClient) -> None:
    r = api.patch(f"{V1}/me", json={"name": "  Ada  ", "job_title": "CTO"})
    assert r.status_code == 200
    assert (r.json()["name"], r.json()["job_title"]) == ("Ada", "CTO")
    assert api.patch(f"{V1}/me", json={"job_title": ""}).json()["job_title"] is None
    assert api.patch(f"{V1}/me", json={"name": None}).status_code == 422
    assert api.patch(f"{V1}/me", json={"name": ""}).status_code == 422


def test_usage_sums_hosted_active_meeting_minutes(api_app: FastAPI, api: TestClient) -> None:
    with api_app.state.session_factory() as db:
        me = f.make_user(db, name="ignored")  # not the default user: lowest id wins
        default = db.get(type(me), 1)
        assert default is not None
        f.make_meeting(db, host=default, duration_ms=90_000)
        f.make_meeting(db, host=default, duration_ms=150_000)
        f.make_meeting(db, host=default, duration_ms=600_000, deleted_at=datetime.now(UTC))
        f.make_meeting(db, host=me, duration_ms=600_000)
        db.commit()
    usage = api.get(f"{V1}/me/usage").json()
    assert usage == {
        "free_meetings_left": 3,
        "free_meetings_total": 3,
        "storage_minutes_used": 4,
        "storage_minutes_total": 400,
    }
