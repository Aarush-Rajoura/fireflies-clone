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
