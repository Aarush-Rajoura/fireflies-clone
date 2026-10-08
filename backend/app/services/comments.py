"""Comment use cases. Deleting a comment hides it (deleted_at) rather than removing the row."""

from datetime import UTC, datetime

from app.core.exceptions import NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.models import Comment, User
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.schemas.common import Page, PageParams
from app.schemas.user import UserRef
from app.services.guards import (
    require_active_meeting,
    require_current_user,
    require_segment_in_meeting,
)


def _read(comment: Comment, author: User | None) -> CommentRead:
    return CommentRead(
        id=comment.id,
        meeting_id=comment.meeting_id,
        segment_id=comment.segment_id,
        author=UserRef.model_validate(author) if author else None,
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


class CommentService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, meeting_id: int, page: PageParams) -> Page[CommentRead]:
        require_active_meeting(self.uow, meeting_id)
        comments, total = self.uow.comments.page_for_meeting(
            meeting_id, page.page_size, page.offset
        )
        authors = {uid: self.uow.users.get(uid) for uid in {c.author_id for c in comments} if uid}
        return Page(
            items=[_read(c, authors.get(c.author_id) if c.author_id else None) for c in comments],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def create(self, meeting_id: int, data: CommentCreate) -> CommentRead:
        require_active_meeting(self.uow, meeting_id)
        if data.segment_id is not None:
            require_segment_in_meeting(self.uow, meeting_id, data.segment_id)
        author = require_current_user(self.uow)
        comment = self.uow.comments.add(
            Comment(
                meeting_id=meeting_id,
                segment_id=data.segment_id,
                author_id=author.id,
                body=data.body,
            )
        )
        self.uow.commit()
        return _read(comment, author)

    def update(self, comment_id: int, data: CommentUpdate) -> CommentRead:
        comment = self._get_writable(comment_id)
        comment.body = data.body
        self.uow.comments.flush()
        self.uow.commit()
        return _read(comment, self.uow.users.get(comment.author_id) if comment.author_id else None)

    def delete(self, comment_id: int) -> None:
        self._get_writable(comment_id).deleted_at = datetime.now(UTC)
        self.uow.commit()

    def _get_writable(self, comment_id: int) -> Comment:
        comment = self.uow.comments.get(comment_id)
        if comment is None or comment.deleted_at is not None:
            raise NotFoundError("Comment not found", code="COMMENT_NOT_FOUND")
        require_active_meeting(self.uow, comment.meeting_id)
        return comment
