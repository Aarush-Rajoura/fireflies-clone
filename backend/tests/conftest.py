from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from alembic import command
from app.core.config import Settings, get_settings
from app.db.session import make_engine, make_session_factory
from app.main import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    # A file DB (not :memory:) so WAL and multi-connection behaviour are real.
    return Settings(database_url=f"sqlite:///{tmp_path / 'test.db'}", media_dir=tmp_path / "media")


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def migrated_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    """A fresh SQLite file built only by `alembic upgrade head`, with app pragmas on."""
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    command.upgrade(alembic_config(), "head")
    engine = make_engine(url)
    yield engine
    engine.dispose()
    get_settings.cache_clear()


def alembic_config() -> Config:
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


@pytest.fixture
def db_session(migrated_engine: Engine) -> Iterator[Session]:
    session = make_session_factory(migrated_engine)()
    yield session
    session.rollback()
    session.close()
