from collections.abc import Sequence

from sqlalchemy import delete, func, select

from app.models import User, UserTool
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

    def tools(self, user_id: int) -> Sequence[str]:
        stmt = select(UserTool.tool).where(UserTool.user_id == user_id).order_by(UserTool.id)
        return list(self.session.scalars(stmt))

    def replace_tools(self, user_id: int, tools: Sequence[str]) -> None:
        self.session.execute(delete(UserTool).where(UserTool.user_id == user_id))
        self.session.add_all(UserTool(user_id=user_id, tool=t) for t in tools)
        self.session.flush()
