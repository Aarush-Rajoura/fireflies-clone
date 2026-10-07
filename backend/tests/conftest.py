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

_SETTINGS_ENV_VARS = (
    "DATABASE_URL", "CORS_ORIGINS", "AI_PROVIDER", "AI_API_KEY", "AI_MODEL",
    "AI_RATE_LIMIT", "MEDIA_DIR", "MAX_UPLOAD_MB", "SEED_ANCHOR_DATE", "APP_VERSION",
)  # fmt: skip


@pytest.fixture(autouse=True)
def _hermetic_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Tests never read backend/.env or the developer's real environment."""
    for name in _SETTINGS_ENV_VARS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


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


@pytest.fixture
def api_app(app: FastAPI, settings: Settings, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    """The app on a migrated, empty database with deterministic AI stubs."""
    from app.ai.factory import get_action_item_extractor, get_summarizer
    from tests.ai_stubs import StubExtractor, StubSummarizer

    monkeypatch.setenv("DATABASE_URL", settings.database_url)
    get_settings.cache_clear()
    command.upgrade(alembic_config(), "head")
    summarizer, extractor = StubSummarizer(), StubExtractor()
    app.dependency_overrides[get_summarizer] = lambda: summarizer
    app.dependency_overrides[get_action_item_extractor] = lambda: extractor
    return app


@pytest.fixture
def api(api_app: FastAPI) -> Iterator[TestClient]:
    """A client on a seeded database."""
    from tests import factories as f

    with api_app.state.session_factory() as db:
        f.make_user(db)
        db.commit()
    with TestClient(api_app, raise_server_exceptions=False) as c:
        yield c
