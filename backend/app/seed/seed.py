"""Populates a database with demo meetings: `python -m app.seed.seed [--reset] [--if-empty]`."""

import argparse
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import Engine, delete, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import make_engine, make_session_factory
from app.db.unit_of_work import UnitOfWork
from app.models import Channel, Meeting, User
from app.models.enums import MeetingSource
from app.seed.content import Person, load_cast, load_past_meetings, load_upcoming
from app.seed.writer import write_meeting

CHANNELS = ("hiring", "product", "customers")
MEDIA_FILE = "sample-meeting.wav"
DEFAULT_USER_KEY = "me"


@dataclass(frozen=True)
class SeedResult:
    meetings_added: int
    skipped: bool = False


def has_users(session: Session) -> bool:
    return bool(session.scalar(select(func.count()).select_from(User)))


def reset(session: Session) -> None:
    # Reverse dependency order keeps foreign keys satisfied; alembic_version is not in metadata.
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(delete(table))
    session.commit()


def seed(
    session: Session, settings: Settings, *, do_reset: bool = False, if_empty: bool = False
) -> SeedResult:
    if if_empty and has_users(session):
        return SeedResult(0, skipped=True)
    if do_reset:
        reset(session)
    anchor = settings.seed_anchor_date or datetime.now(UTC)
    if anchor.tzinfo is None:
        anchor = anchor.replace(tzinfo=UTC)
    media_url = f"media/{MEDIA_FILE}" if (Path(settings.media_dir) / MEDIA_FILE).is_file() else None
    cast = {p.key: p for p in load_cast()}
    with UnitOfWork(session) as uow:
        users = _ensure_users(uow, cast)
        channels = _ensure_channels(uow, users[DEFAULT_USER_KEY])
        added = 0
        for m in [*load_past_meetings(), *load_upcoming()]:
            if _exists(session, m.title):
                continue
            write_meeting(
                uow, m, anchor=anchor, cast=cast, users=users, channels=channels,
                media_url=media_url,
            )  # fmt: skip
            added += 1
        uow.commit()
    return SeedResult(added)


def _exists(session: Session, title: str) -> bool:
    # Titles are unique within the seed set; dates move with "today", so they cannot be the key.
    stmt = select(Meeting.id).where(Meeting.title == title, Meeting.source == MeetingSource.SEED)
    return session.scalar(stmt) is not None


def _ensure_users(uow: UnitOfWork, cast: dict[str, Person]) -> dict[str, User]:
    users: dict[str, User] = {}
    for key, person in cast.items():
        user = uow.users.get_by_email(person.email)
        if user is None:
            user = uow.users.add(User(name=person.name, email=person.email, job_title=person.title))
        users[key] = user
    me = users[DEFAULT_USER_KEY]
    if me.onboarded_at is None:
        me.onboarded_at = datetime.now(UTC)
        me.job_title = cast[DEFAULT_USER_KEY].title
        uow.flush()
    return users


def _ensure_channels(uow: UnitOfWork, owner: User) -> dict[str, Channel]:
    channels: dict[str, Channel] = {}
    for slug in CHANNELS:
        channel = uow.channels.get_by_slug(slug)
        if channel is None:
            channel = uow.channels.add(Channel(name=slug.title(), slug=slug, created_by=owner.id))
        channels[slug] = channel
    return channels


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed demo data.")
    parser.add_argument("--reset", action="store_true", help="delete all data first")
    parser.add_argument("--if-empty", action="store_true", help="do nothing if any user exists")
    args = parser.parse_args(argv)
    settings = get_settings()
    engine: Engine = make_engine(settings.database_url)
    factory: sessionmaker[Session] = make_session_factory(engine)
    with factory() as session:
        result = seed(session, settings, do_reset=args.reset, if_empty=args.if_empty)
    engine.dispose()
    print("database already populated, nothing to do" if result.skipped
          else f"seeded {result.meetings_added} new meetings")  # fmt: skip
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
