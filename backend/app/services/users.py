from app.db.unit_of_work import UnitOfWork
from app.schemas.common import Page, PageParams
from app.schemas.user import UserRead


class UserService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, page: PageParams) -> Page[UserRead]:
        users, total = self.uow.users.list(page.page_size, page.offset)
        return Page(
            items=[
                UserRead(id=u.id, name=u.name, email=u.email, avatar_url=u.avatar_url)
                for u in users
            ],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )
