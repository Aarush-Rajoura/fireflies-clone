"""Unit of Work: owns the session and the transaction boundary (repositories added later)."""

from types import TracebackType

from sqlalchemy.orm import Session


class UnitOfWork:
    def __init__(self, session: Session) -> None:
        self.session = session

    def __enter__(self) -> "UnitOfWork":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        # Rolling back after a commit is a no-op, so this covers "left without commit".
        self.session.rollback()
        self.session.close()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
