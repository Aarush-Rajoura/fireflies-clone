"""In-app notifications for the single default user.

`record` is a side effect of other use cases: it runs after their commit, in its own
short transaction, and swallows failures, so a notification can never undo or fail
the action it reports.
"""

import logging
from datetime import UTC, datetime

from app.core.exceptions import NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.models import Notification
from app.models.enums import NotificationKind
from app.schemas.common import Page, PageParams
from app.schemas.home import NotificationRead, NotificationUpdate
from app.services.guards import require_current_user

logger = logging.getLogger(__name__)

TITLE_MAX = 300


class NotificationService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, page: PageParams) -> Page[NotificationRead]:
        user = require_current_user(self.uow)
        rows, total = self.uow.notifications.list_for(user.id, page.page_size, page.offset)
        return Page(
            items=[NotificationRead.model_validate(n) for n in rows],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def update(self, notification_id: int, data: NotificationUpdate) -> NotificationRead:
        user = require_current_user(self.uow)
        row = self.uow.notifications.get_for(user.id, notification_id)
        if row is None:
            raise NotFoundError("Notification not found", code="NOTIFICATION_NOT_FOUND")
        if not data.read:
            row.read_at = None
        elif row.read_at is None:
            # Keep the first read time; re-marking a read row is a no-op.
            row.read_at = datetime.now(UTC)
        self.uow.commit()
        return NotificationRead.model_validate(row)

    def mark_all_read(self) -> None:
        user = require_current_user(self.uow)
        self.uow.notifications.mark_all_read(user.id, datetime.now(UTC))
        self.uow.commit()

    def record(
        self,
        kind: NotificationKind,
        title: str,
        body: str = "",
        link: str | None = None,
    ) -> None:
        """Best effort: never raises. Call only after the main use case has committed."""
        try:
            user = self.uow.users.get_default()
            if user is None:
                return
            self.uow.notifications.add(
                Notification(
                    user_id=user.id, kind=kind, title=title[:TITLE_MAX], body=body, link=link
                )
            )
            self.uow.commit()
        except Exception:
            self.uow.rollback()
            logger.warning("Could not record %s notification", kind, exc_info=True)
