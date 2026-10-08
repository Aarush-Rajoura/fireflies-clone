from typing import Any

from fastapi.testclient import TestClient

V1 = "/api/v1"


def _create(api: TestClient, name: str = "Acme") -> dict[str, Any]:
    r = api.post(f"{V1}/teams", json={"name": name})
    assert r.status_code == 201, r.text
    return dict(r.json())


def test_me_is_404_without_a_team_then_200(api: TestClient) -> None:
    r = api.get(f"{V1}/teams/me")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NO_TEAM"
    team = _create(api)
    r = api.get(f"{V1}/teams/me")
    assert r.status_code == 200
    assert r.json()["id"] == team["id"] and r.json()["my_role"] == "owner"
    assert _create_conflict(api) == "TEAM_EXISTS"


def _create_conflict(api: TestClient) -> str:
    r = api.post(f"{V1}/teams", json={"name": "Again"})
    assert r.status_code == 409
    return str(r.json()["error"]["code"])


def test_invite_flow_over_http(api: TestClient) -> None:
    team = _create(api)
    url = f"{V1}/teams/{team['id']}/members"
    r = api.post(url, json={"emails": ["ana@example.com", "bo@example.com"], "role": "admin"})
    assert r.status_code == 201, r.text
    invited = r.json()["invited"]
    assert [m["invite_url"][:6] for m in invited] == ["/join/", "/join/"]

    dup = api.post(url, json={"emails": ["ANA@example.com"]})
    assert dup.status_code == 409
    assert dup.json()["error"]["code"] == "MEMBER_EXISTS"

    member_id = invited[0]["id"]
    r = api.patch(f"{V1}/team-members/{member_id}", json={"role": "member"})
    assert r.status_code == 200 and r.json()["role"] == "member"

    token = invited[1]["invite_url"].removeprefix("/join/")
    r = api.post(f"{V1}/team-invites/{token}/accept")
    assert r.status_code == 200 and r.json()["status"] == "active"

    r = api.delete(f"{V1}/team-members/{member_id}")
    assert r.status_code == 204 and r.content == b""
    assert len(api.get(f"{V1}/teams/me").json()["members"]) == 2

    r = api.patch(f"{V1}/teams/{team['id']}", json={"name": "  Acme Inc "})
    assert r.status_code == 200 and r.json()["name"] == "Acme Inc"


def test_validation_errors_are_422(api: TestClient) -> None:
    team = _create(api)
    url = f"{V1}/teams/{team['id']}/members"
    for body in (
        {"emails": ["not-an-email"]},
        {"emails": []},
        {"emails": ["a@example.com"], "role": "owner"},
        {"emails": ["a@example.com"], "extra": 1},
    ):
        r = api.post(url, json=body)
        assert r.status_code == 422, body
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert api.post(f"{V1}/teams", json={"name": "   "}).status_code == 422
    owner = team["members"][0]["id"]
    assert api.patch(f"{V1}/team-members/{owner}", json={"role": "boss"}).status_code == 422


def test_owner_protection_and_missing_rows(api: TestClient) -> None:
    team = _create(api)
    owner = team["members"][0]["id"]
    r = api.delete(f"{V1}/team-members/{owner}")
    assert r.status_code == 409 and r.json()["error"]["code"] == "LAST_OWNER"
    r = api.patch(f"{V1}/team-members/{owner}", json={"role": "admin"})
    assert r.status_code == 409
    assert api.delete(f"{V1}/team-members/999").status_code == 404
    assert api.post(f"{V1}/team-invites/nope/accept").status_code == 404
    r = api.post(f"{V1}/teams/999/members", json={"emails": ["a@example.com"]})
    assert r.status_code == 404 and r.json()["error"]["code"] == "TEAM_NOT_FOUND"


def test_member_role_is_forbidden_to_manage(api: TestClient) -> None:
    team = _create(api)
    url = f"{V1}/teams/{team['id']}/members"
    me_seat = team["members"][0]["id"]
    [guest] = api.post(url, json={"emails": ["guest@example.com"]}).json()["invited"]
    api.post(f"{V1}/team-invites/{guest['invite_url'].removeprefix('/join/')}/accept")
    assert api.patch(f"{V1}/team-members/{guest['id']}", json={"role": "owner"}).status_code == 200
    assert api.patch(f"{V1}/team-members/{me_seat}", json={"role": "member"}).status_code == 200

    r = api.post(url, json={"emails": ["x@example.com"]})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"
    assert api.delete(f"{V1}/team-members/{guest['id']}").status_code == 403
    # Onboarding invites from a plain member are not an error, just nobody invited.
    assert _onboard(api, ["new@x.io"])["invites_sent"] == 0


def _onboard(api: TestClient, invite_emails: list[str]) -> dict[str, Any]:
    body = {
        "join_preference": "owned",
        "recap_preference": "everyone",
        "role": "Engineering",
        "invite_emails": invite_emails,
    }
    r = api.put(f"{V1}/me/onboarding", json=body)
    assert r.status_code == 200, r.text
    return dict(r.json())


def test_onboarding_invites_create_the_users_team(api: TestClient) -> None:
    assert _onboard(api, ["Ana@x.io", "bo@x.io"])["invites_sent"] == 2
    team = api.get(f"{V1}/teams/me").json()
    assert team["name"] == "Sarah's team" and team["my_role"] == "owner"
    assert [(m["email"], m["status"]) for m in team["members"][1:]] == [
        ("ana@x.io", "invited"),
        ("bo@x.io", "invited"),
    ]
    # Re-running onboarding reuses the team and only counts new people.
    assert _onboard(api, ["ana@x.io", "cy@x.io"])["invites_sent"] == 1
    assert len(api.get(f"{V1}/teams/me").json()["members"]) == 4


def test_onboarding_without_invites_creates_no_team(api: TestClient) -> None:
    assert _onboard(api, [])["invites_sent"] == 0
    assert api.get(f"{V1}/teams/me").status_code == 404


def test_onboarding_invites_go_to_an_existing_team(api: TestClient) -> None:
    team = _create(api, "Acme")
    assert _onboard(api, ["ana@x.io"])["invites_sent"] == 1
    me = api.get(f"{V1}/teams/me").json()
    assert me["id"] == team["id"] and me["name"] == "Acme" and len(me["members"]) == 2
