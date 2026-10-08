"""Alembic environment: URL and metadata come from the application itself."""

from logging.config import fileConfig

from sqlalchemy import Connection

import app.models  # noqa: F401  (registers every model on Base.metadata)
from alembic import context
from app.core.config import get_settings
from app.db.base import Base
from app.db.migration_filters import include_object
from app.db.session import make_engine

config = context.config
# The app passes its own connection when it migrates on startup; only the CLI
# configures logging (fileConfig would otherwise silence the app's loggers).
app_connection = config.attributes.get("connection")
if app_connection is None and config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Single source of truth for the URL: Settings, never alembic.ini.
# ConfigParser interpolation treats % specially, so literal percents must be doubled.
config.set_main_option("sqlalchemy.url", get_settings().database_url.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=True,  # SQLite cannot ALTER most things in place
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_on(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
        compare_type=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    if app_connection is not None:
        run_migrations_on(app_connection)
        return
    # Same engine factory as the app, so migrations get the same pragmas (journal mode).
    settings = get_settings()
    connectable = make_engine(settings.database_url, settings.sqlite_journal_mode)
    with connectable.connect() as connection:
        run_migrations_on(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
