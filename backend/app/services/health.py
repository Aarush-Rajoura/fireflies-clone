"""Liveness of the dependencies the API needs."""

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ServiceUnavailableError
from app.db.unit_of_work import UnitOfWork


class HealthService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def check_database(self) -> None:
        try:
            self.uow.session.execute(text("SELECT 1"))
        except SQLAlchemyError as exc:
            raise ServiceUnavailableError("Database is unreachable") from exc
