from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.db.session import make_engine, make_session_factory
from app.db.unit_of_work import UnitOfWork
from app.main import create_app


def test_connection_pragmas(settings: Settings) -> None:
    engine = make_engine(settings.database_url)
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1
        assert conn.execute(text("PRAGMA journal_mode")).scalar() == "wal"
        assert conn.execute(text("PRAGMA busy_timeout")).scalar() == 5000


def test_uow_rolls_back_without_commit(settings: Settings) -> None:
    engine = make_engine(settings.database_url)
    factory = make_session_factory(engine)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE t (id INTEGER PRIMARY KEY)"))

    with UnitOfWork(factory()) as uow:
        uow.session.execute(text("INSERT INTO t (id) VALUES (1)"))
        uow.session.flush()
    with UnitOfWork(factory()) as uow:
        assert uow.session.execute(text("SELECT COUNT(*) FROM t")).scalar() == 0

    with UnitOfWork(factory()) as uow:
        uow.session.execute(text("INSERT INTO t (id) VALUES (2)"))
        uow.commit()
    with UnitOfWork(factory()) as uow:
        assert uow.session.execute(text("SELECT COUNT(*) FROM t")).scalar() == 1


def test_health_ok(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "db": "up", "version": "0.1.0", "ai_provider": "mock"}


def test_health_503_when_db_unreachable() -> None:
    app: FastAPI = create_app(Settings(database_url="sqlite:////no/such/dir/x.db"))
    r = TestClient(app).get("/api/health")
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
