"""FastAPI dependencies."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session, sessionmaker

from app.core.exceptions import ServiceUnavailableError
from app.db.unit_of_work import UnitOfWork
from app.models import User


def get_uow(request: Request) -> Iterator[UnitOfWork]:
    # The factory lives on app.state so each app (and test) gets its own database.
    factory: sessionmaker[Session] = request.app.state.session_factory
    with UnitOfWork(factory()) as uow:
        yield uow


def get_current_user(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> User:
    user = uow.users.get_default()
    if user is None:
        raise ServiceUnavailableError("Database has not been seeded", code="NOT_SEEDED")
    return user
