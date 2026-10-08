from sqlalchemy import func, select

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

    def page_for_meeting(
        self, meeting_id: int, limit: int, offset: int
    ) -> tuple[list[Comment], int]:
        """Live comments, oldest first, so a thread reads top to bottom."""
        where = (Comment.meeting_id == meeting_id, Comment.deleted_at.is_(None))
        total = self.session.scalar(select(func.count()).select_from(Comment).where(*where))
        stmt = (
            select(Comment)
            .where(*where)
            .order_by(Comment.created_at, Comment.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0
