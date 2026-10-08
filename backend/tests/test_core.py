import logging
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.exceptions import (
    AppError,
    ConflictError,
    GoneError,
    NotFoundError,
    ServiceUnavailableError,
    ValidationFailedError,
)
from app.main import create_app
from app.schemas.common import Page, PageParams


def test_cors_origins_parse_from_comma_separated_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test, http://b.test")
    assert Settings().cors_origins == ["http://a.test", "http://b.test"]


def test_settings_defaults() -> None:
    s = Settings(_env_file=None)
    assert s.ai_provider == "mock"
    assert s.max_upload_mb == 10


CASES: list[tuple[type[AppError], int, str]] = [
    (NotFoundError, 404, "NOT_FOUND"),
    (GoneError, 410, "GONE"),
    (ValidationFailedError, 422, "VALIDATION_ERROR"),
    (ConflictError, 409, "CONFLICT"),
    (ServiceUnavailableError, 503, "SERVICE_UNAVAILABLE"),
]


@pytest.mark.parametrize(("exc", "status", "code"), CASES)
def test_domain_exceptions_map_to_envelope(
    app: FastAPI, exc: type[AppError], status: int, code: str
) -> None:
    def boom() -> None:
        raise exc("nope", details={"k": "v"})

    app.add_api_route("/_boom", boom)
    r = TestClient(app).get("/_boom")
    assert r.status_code == status
    assert r.json() == {"error": {"code": code, "message": "nope", "details": {"k": "v"}}}


def test_unhandled_exception_is_500_without_traceback(app: FastAPI) -> None:
    def boom() -> None:
        raise RuntimeError("secret internals")

    app.add_api_route("/_crash", boom)
    r = TestClient(app, raise_server_exceptions=False).get("/_crash")
    body = r.json()
    assert r.status_code == 500
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["details"]["request_id"] == r.headers["X-Request-ID"]
    assert "secret internals" not in r.text
    assert "Traceback" not in r.text


def test_validation_error_is_422_envelope(app: FastAPI) -> None:
    def needs_int(n: int) -> int:
        return n

    app.add_api_route("/_int", needs_int)
    r = TestClient(app).get("/_int?n=abc")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert r.json()["error"]["details"]["errors"]


def test_request_id_generated_and_echoed(client: TestClient) -> None:
    assert client.get("/api/health").headers["X-Request-ID"]
    r = client.get("/api/health", headers={"X-Request-ID": "abc-123"})
    assert r.headers["X-Request-ID"] == "abc-123"


def test_page_params_clamp_and_offset() -> None:
    assert PageParams(page_size=500).page_size == 100
    assert PageParams().page_size == 20
    assert PageParams(page=3, page_size=10).offset == 20


def test_page_computed_fields() -> None:
    p = Page[int](items=[1], page=1, page_size=10, total=21)
    assert p.total_pages == 3
    assert p.has_next is True
    last = Page[int](items=[1], page=3, page_size=10, total=21)
    assert last.has_next is False
    assert Page[int](items=[], page=1, page_size=10, total=0).total_pages == 0
    assert "total_pages" in p.model_dump()


@pytest.mark.parametrize("bad", ["has space", "semi;colon", "x" * 129, "new\tline"])
def test_invalid_inbound_request_id_is_replaced(client: TestClient, bad: str) -> None:
    r = client.get("/api/health", headers={"X-Request-ID": bad})
    assert r.headers["X-Request-ID"] != bad
    assert len(r.headers["X-Request-ID"]) == 32


def test_valid_inbound_request_id_is_kept(client: TestClient) -> None:
    r = client.get("/api/health", headers={"X-Request-ID": "abc-1.2_X" + "y" * 119})
    assert r.headers["X-Request-ID"] == "abc-1.2_X" + "y" * 119


def test_access_log_line_is_emitted_at_configured_level(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    app = create_app(Settings(database_url=f"sqlite:///{tmp_path / 'l.db'}", log_level="info"))
    assert logging.getLogger("app").level == logging.INFO
    with caplog.at_level(logging.INFO, logger="app.request"), TestClient(app) as c:
        c.get("/api/health")
    assert any("GET /api/health ->" in r.getMessage() for r in caplog.records)
    create_app(Settings(database_url=f"sqlite:///{tmp_path / 'l.db'}", log_level="WARNING"))
    assert logging.getLogger("app").level == logging.WARNING
    logging.getLogger("app").setLevel(logging.INFO)
