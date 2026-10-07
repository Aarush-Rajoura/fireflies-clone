"""Engine and session factory built from settings (no module-level global engine)."""

from typing import Any

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker


def _set_sqlite_pragmas(dbapi_connection: Any, _: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")  # readers don't block the single writer
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


def make_engine(database_url: str) -> Engine:
    is_sqlite = database_url.startswith("sqlite")
    # FastAPI runs sync endpoints in a thread pool, so connections cross threads.
    engine = create_engine(
        database_url, connect_args={"check_same_thread": False} if is_sqlite else {}
    )
    if is_sqlite:
        event.listen(engine, "connect", _set_sqlite_pragmas)
    return engine


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    # expire_on_commit=False so objects stay readable for response serialisation.
    return sessionmaker(bind=engine, expire_on_commit=False)
