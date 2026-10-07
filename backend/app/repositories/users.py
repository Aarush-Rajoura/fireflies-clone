from sqlalchemy import func, select

from app.models import User
from app.repositories.base import Repository


class UserRepository(Repository[User]):
    model = User

    def get_default(self) -> User | None:
        """The single-tenant default user: the lowest id."""
        return self.session.scalar(select(User).order_by(User.id).limit(1))

    def get_by_email(self, email: str) -> User | None:
        return self.session.scalar(select(User).where(User.email == email))

    def list(self, limit: int, offset: int) -> tuple[list[User], int]:
        total = self.session.scalar(select(func.count()).select_from(User)) or 0
        stmt = select(User).order_by(User.name, User.id).limit(limit).offset(offset)
        return list(self.session.scalars(stmt)), total
