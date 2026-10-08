"""Bring the database schema to the latest Alembic revision from inside the app."""

import logging
from pathlib import Path

from alembic.config import Config
from sqlalchemy import Engine
from sqlalchemy.exc import OperationalError

from alembic import command

_ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"
logger = logging.getLogger(__name__)


def upgrade_to_head(engine: Engine) -> None:
    # Runs on the app's own engine, so the web process migrates the file it serves.
    # (On PythonAnywhere a console runs on another host, where upgrades did not stick.)
    # An unreachable database must not stop the app: /api/health then reports 503.
    config = Config(str(_ALEMBIC_INI))
    try:
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
    except OperationalError:
        logger.exception("Startup migration failed; the database is unavailable")
