"""FastAPI dependencies."""

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session, sessionmaker

from app.db.unit_of_work import UnitOfWork


def get_uow(request: Request) -> Iterator[UnitOfWork]:
    # The factory lives on app.state so each app (and test) gets its own database.
    factory: sessionmaker[Session] = request.app.state.session_factory
    with UnitOfWork(factory()) as uow:
        yield uow
