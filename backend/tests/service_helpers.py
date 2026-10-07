"""Shared setup for service tests."""

from sqlalchemy.orm import Session

from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, User
from tests import factories as f


def make_uow(db: Session) -> UnitOfWork:
    return UnitOfWork(db)


def seeded(db: Session) -> tuple[UnitOfWork, User, Meeting]:
    """A default user (lowest id) hosting one meeting, committed so services see real state."""
    user = f.make_user(db)
    meeting = f.make_meeting(db, host=user)
    db.commit()
    return UnitOfWork(db), user, meeting
