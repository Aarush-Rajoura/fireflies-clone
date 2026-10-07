from sqlalchemy import select

from app.models import Comment
from app.repositories.base import Repository


class CommentRepository(Repository[Comment]):
    model = Comment

    def list_for_meeting(self, meeting_id: int) -> list[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.meeting_id == meeting_id, Comment.deleted_at.is_(None))
            .order_by(Comment.created_at, Comment.id)
        )
        return list(self.session.scalars(stmt))
