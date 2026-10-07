"""Generic repository: the four operations every aggregate needs. Never commits."""

from sqlalchemy.orm import Session


class Repository[T]:
    model: type[T]

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, id: int) -> T | None:
        return self.session.get(self.model, id)

    def add(self, entity: T) -> T:
        self.session.add(entity)
        self.session.flush()
        return entity

    def delete(self, entity: T) -> None:
        self.session.delete(entity)
        self.session.flush()

    def flush(self) -> None:
        self.session.flush()
