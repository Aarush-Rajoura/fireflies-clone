from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_unknown_route_is_404_envelope(client: TestClient) -> None:
    r = client.get("/nope")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert set(body["error"]) == {"code", "message", "details"}


def test_wrong_method_is_405_envelope(client: TestClient) -> None:
    r = client.post("/api/health")
    assert r.status_code == 405
    assert r.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_every_response_has_request_id(client: TestClient) -> None:
    assert "X-Request-ID" in client.get("/nope").headers


# --- v1 resource routes -------------------------------------------------------

ENVELOPE_KEYS = {"items", "page", "page_size", "total", "total_pages", "has_next"}


def _meeting_id(api: TestClient) -> int:
    body = {
        "title": "Sync",
        "participants": ["Bob"],
        "segments": [{"speaker": "Alice", "start_ms": 0, "end_ms": 900, "text": "Hello team"}],
    }
    r = api.post("/api/v1/meetings", json=body)
    assert r.status_code == 201, r.text
    return int(r.json()["id"])


def test_every_list_route_returns_the_page_envelope(api: TestClient) -> None:
    mid = _meeting_id(api)
    for path in (
        "/api/v1/meetings",
        f"/api/v1/meetings/{mid}/action-items",
        "/api/v1/search?q=hello",
        "/api/v1/channels",
        "/api/v1/users",
    ):
        r = api.get(path)
        assert r.status_code == 200, path
        assert set(r.json()) == ENVELOPE_KEYS, path


def test_page_size_is_clamped_to_100(api: TestClient) -> None:
    assert api.get("/api/v1/meetings?page_size=500").json()["page_size"] == 100


def test_every_delete_is_204_with_empty_body(api: TestClient) -> None:
    mid = _meeting_id(api)
    item = api.post(f"/api/v1/meetings/{mid}/action-items", json={"text": "Do it"}).json()
    channel = api.post("/api/v1/channels", json={"name": "Sales"}).json()
    for path in (
        f"/api/v1/action-items/{item['id']}",
        f"/api/v1/channels/{channel['id']}",
        f"/api/v1/meetings/{mid}",
    ):
        r = api.delete(path)
        assert r.status_code == 204, path
        assert r.content == b""


def test_validation_error_details_are_keyed_by_field_path(api: TestClient) -> None:
    r = api.post("/api/v1/meetings", json={"title": "", "segments": [{"speaker": "A"}]})
    assert r.status_code == 422
    body = r.json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    locs = {tuple(e["loc"]) for e in body["details"]["errors"]}
    assert ("body", "title") in locs
    assert ("body", "segments", "0", "start_ms") in locs


def test_declared_errors_match_real_statuses(api: TestClient) -> None:
    assert api.get("/api/v1/meetings/999").status_code == 404
    assert api.post("/api/v1/channels", json={"name": "A"}).status_code == 201
    dup = api.post("/api/v1/channels", json={"name": "A"})
    assert dup.status_code == 409
    assert dup.json()["error"]["code"] == "CHANNEL_EXISTS"
    assert api.get("/api/v1/search?q=").status_code == 422


def test_me_returns_the_default_user(api: TestClient) -> None:
    r = api.get("/api/v1/me")
    assert r.status_code == 200
    assert set(r.json()) == {"id", "name", "avatar_url", "email"}


def test_unseeded_database_is_503_envelope(api_app: FastAPI) -> None:
    r = TestClient(api_app, raise_server_exceptions=False).get("/api/v1/me")
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "NOT_SEEDED"


def test_meeting_filters_are_query_params(api: TestClient) -> None:
    _meeting_id(api)
    ok = api.get("/api/v1/meetings?q=Sync&scope=hosted&sort=title&tag=1&tag=2&channel=9")
    assert ok.status_code == 200 and ok.json()["total"] == 0
    assert api.get("/api/v1/meetings?scope=bogus").status_code == 422
    assert api.get("/api/v1/meetings?date_from=2000-01-01").json()["total"] == 1


def test_parse_multipart_and_text(api: TestClient) -> None:
    vtt = "WEBVTT\n\n00:00.000 --> 00:02.000\n<v Alice>Hello there\n"
    r = api.post("/api/v1/transcripts/parse", files={"file": ("a.vtt", vtt, "text/vtt")})
    assert r.status_code == 200 and r.json()["segment_count"] == 1
    r = api.post("/api/v1/transcripts/parse-text", json={"text": vtt, "filename": "a.vtt"})
    assert r.status_code == 200 and r.json()["format"] == "vtt"
    assert api.post("/api/v1/transcripts/parse-text", json={"text": "  "}).status_code == 422


def test_oversized_upload_is_rejected_while_reading(app: FastAPI, api: TestClient) -> None:
    limit = app.state.settings.max_upload_mb * 1024 * 1024
    big = b"a" * (limit + 1)
    r = api.post("/api/v1/transcripts/parse", files={"file": ("big.txt", big, "text/plain")})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "UPLOAD_TOO_LARGE"


def test_ai_route_is_rate_limited_with_envelope(api: TestClient) -> None:
    mid = _meeting_id(api)
    codes = [api.post(f"/api/v1/meetings/{mid}/summary/regenerate").status_code for _ in range(12)]
    assert codes[:10] == [200] * 10
    assert 429 in codes
    r = api.post(f"/api/v1/meetings/{mid}/summary/regenerate")
    assert r.json()["error"]["code"] == "RATE_LIMITED"
    # Non-AI routes are never limited.
    assert all(api.get("/api/v1/meetings").status_code == 200 for _ in range(15))
