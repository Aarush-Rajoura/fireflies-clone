from app.core.exceptions import ServiceUnavailableError
from app.db.unit_of_work import UnitOfWork
from app.models import User
from app.schemas.common import Page, PageParams
from app.schemas.user import UserRead


def _read(user: User) -> UserRead:
    return UserRead(id=user.id, name=user.name, email=user.email, avatar_url=user.avatar_url)


class UserService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def me(self) -> UserRead:
        """The demo user (the first one); there is no authentication."""
        user = self.uow.users.get_default()
        if user is None:
            raise ServiceUnavailableError("Database has not been seeded", code="NOT_SEEDED")
        return _read(user)

    def list(self, page: PageParams) -> Page[UserRead]:
        users, total = self.uow.users.list(page.page_size, page.offset)
        return Page(
            items=[_read(u) for u in users],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )
