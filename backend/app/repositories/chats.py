"""AskFred threads, their messages and the citations on assistant messages."""

from collections.abc import Sequence

from sqlalchemy import exists, func, or_, select

from app.models import ChatCitation, ChatMessage, ChatThread, Meeting
from app.repositories.base import Repository


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class ChatRepository(Repository[ChatThread]):
    model = ChatThread

    def get_for_user(self, thread_id: int, user_id: int) -> ChatThread | None:
        thread = self.session.get(ChatThread, thread_id)
        return thread if thread is not None and thread.user_id == user_id else None

    def page_for_user(
        self, user_id: int, q: str | None, limit: int, offset: int
    ) -> tuple[list[ChatThread], int]:
        """Most recently active first; `q` matches the title or any message, case-insensitively."""
        where = [ChatThread.user_id == user_id]
        if q and q.strip():
            pattern = f"%{_escape_like(q.strip().lower())}%"
            in_messages = exists(
                select(ChatMessage.id).where(
                    ChatMessage.thread_id == ChatThread.id,
                    func.lower(ChatMessage.content).like(pattern, escape="\\"),
                )
            )
            where.append(or_(func.lower(ChatThread.title).like(pattern, escape="\\"), in_messages))
        total = self.session.scalar(select(func.count()).select_from(ChatThread).where(*where))
        stmt = (
            select(ChatThread)
            .where(*where)
            .order_by(ChatThread.updated_at.desc(), ChatThread.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0

    def messages(self, thread_id: int) -> list[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at, ChatMessage.id)
        )
        return list(self.session.scalars(stmt))

    def page_messages(
        self, thread_id: int, limit: int, offset: int
    ) -> tuple[list[ChatMessage], int]:
        where = ChatMessage.thread_id == thread_id
        total = self.session.scalar(select(func.count()).select_from(ChatMessage).where(where))
        stmt = (
            select(ChatMessage)
            .where(where)
            .order_by(ChatMessage.created_at, ChatMessage.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0

    def citations(self, message_ids: Sequence[int]) -> dict[int, list[tuple[ChatCitation, str]]]:
        """Citations per message in insertion order, each with its meeting's current title."""
        if not message_ids:
            return {}
        stmt = (
            select(ChatCitation, Meeting.title)
            .join(Meeting, Meeting.id == ChatCitation.meeting_id)
            .where(ChatCitation.message_id.in_(message_ids))
            .order_by(ChatCitation.id)
        )
        out: dict[int, list[tuple[ChatCitation, str]]] = {}
        for citation, title in self.session.execute(stmt):
            out.setdefault(citation.message_id, []).append((citation, title))
        return out

    def add_message(self, message: ChatMessage) -> ChatMessage:
        self.session.add(message)
        self.session.flush()
        return message

    def add_citations(self, citations: Sequence[ChatCitation]) -> None:
        self.session.add_all(citations)
        self.session.flush()
