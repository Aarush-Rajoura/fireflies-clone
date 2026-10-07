from sqlalchemy import select

from app.models import User
from app.repositories.base import Repository


class UserRepository(Repository[User]):
    model = User

    def get_default(self) -> User | None:
        """The single-tenant default user: the lowest id."""
        return self.session.scalar(select(User).order_by(User.id).limit(1))

    def get_by_email(self, email: str) -> User | None:
        return self.session.scalar(select(User).where(User.email == email))
