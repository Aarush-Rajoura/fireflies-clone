from pathlib import Path

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from conftest import alembic_config
from sqlalchemy import Engine, inspect, text

from alembic import command
from app.db.base import Base
from app.db.migration_filters import include_object
from app.db.session import make_engine


def _tables(engine: Engine) -> set[str]:
    with engine.connect() as c:
        return set(inspect(c).get_table_names())


def test_upgrade_creates_all_domain_tables(migrated_engine: Engine) -> None:
    expected = {
        "users", "meetings", "participants", "speakers", "transcript_segments", "summaries",
        "summary_sections", "keywords", "action_items", "tags", "meeting_tags", "comments",
        "highlights", "soundbites", "channels", "transcript_fts",
    }  # fmt: skip
    assert expected <= _tables(migrated_engine)


def test_downgrade_base_then_upgrade_round_trips(migrated_engine: Engine, tmp_path: Path) -> None:
    cfg = alembic_config()
    command.downgrade(cfg, "base")
    assert _tables(migrated_engine) - {"alembic_version"} == set()
    command.upgrade(cfg, "head")
    assert "transcript_fts" in _tables(migrated_engine)


def test_autogenerate_reports_no_diff_after_upgrade(migrated_engine: Engine) -> None:
    with migrated_engine.connect() as conn:
        ctx = MigrationContext.configure(
            conn,
            opts={
                "compare_type": True,
                "render_as_batch": True,
                "include_object": include_object,
            },
        )
        assert compare_metadata(ctx, Base.metadata) == []


def test_alembic_check_command_passes(migrated_engine: Engine) -> None:
    command.check(alembic_config())


@pytest.mark.parametrize(
    ("name", "kept"),
    [
        ("transcript_fts", False),
        ("transcript_fts_data", False),
        ("transcript_fts_idx", False),
        ("transcript_fts_docsize", False),
        ("transcript_fts_config", False),
        ("transcript_fts_content", False),
        ("meetings", True),
    ],
)
def test_include_object_hides_fts_tables(name: str, kept: bool) -> None:
    assert include_object(None, name, "table", True, None) is kept


def test_percent_in_database_url_is_escaped(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import get_settings

    url = f"sqlite:///{tmp_path / 'we%ird.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    engine = make_engine(url)
    try:
        command.upgrade(alembic_config(), "head")
        assert "meetings" in _tables(engine)
    finally:
        engine.dispose()
        get_settings.cache_clear()


def test_fts_triggers_exist(migrated_engine: Engine) -> None:
    with migrated_engine.connect() as c:
        names = {
            r[0] for r in c.execute(text("SELECT name FROM sqlite_master WHERE type='trigger'"))
        }
    assert {"transcript_segments_ai", "transcript_segments_au", "transcript_segments_ad"} <= names
