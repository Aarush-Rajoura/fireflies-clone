"""AskFred conversations.

Posting a question runs in four steps so the database is never locked while an
AI works: read what the skill needs in a short transaction that is rolled back,
save the question in its own short transaction, let the skill finish with no
transaction open, then save the answer and its citations in a second one.
"""

from collections.abc import Callable
from datetime import UTC, datetime

from app.core.exceptions import NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.models import ChatCitation, ChatMessage, ChatThread
from app.models.enums import ChatRole
from app.schemas.chat import (
    ChatCitationRead,
    ChatExchange,
    ChatMessageCreate,
    ChatMessageRead,
    ChatSkillRead,
    ChatThreadDetail,
    ChatThreadRead,
)
from app.schemas.common import Page, PageParams
from app.services.chat_skills import ChatSkill, SkillReply, SkillRequest, SkillRouter
from app.services.guards import require_active_meeting, require_current_user

TITLE_CHARS = 60


def _utcnow() -> datetime:
    return datetime.now(UTC)


def thread_title(question: str, skill: ChatSkill, meeting_title: str | None = None) -> str:
    """The first question, on one line, cut at a word boundary to fit TITLE_CHARS.
    An @-mentioned meeting is named too, since "summarize" alone says little."""
    text = " ".join(question.split())
    if text.startswith("/"):
        text = text.split(" ", 1)[1] if " " in text else ""
    text = text or skill.label
    if meeting_title:
        text = f"{text} · {meeting_title}"
    if len(text) <= TITLE_CHARS:
        return text
    cut = text[: TITLE_CHARS - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,.;:-") + "…"


def thread_not_found() -> NotFoundError:
    return NotFoundError("Chat not found", code="CHAT_NOT_FOUND")


def _thread_read(thread: ChatThread) -> ChatThreadRead:
    return ChatThreadRead(
        id=thread.id,
        title=thread.title,
        meeting_id=thread.meeting_id,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


def _message_read(
    message: ChatMessage, citations: list[tuple[ChatCitation, str]]
) -> ChatMessageRead:
    return ChatMessageRead(
        id=message.id,
        role=message.role,
        content=message.content,
        skill=message.skill,
        provider=message.provider,
        model=message.model,
        created_at=message.created_at,
        citations=[
            ChatCitationRead(
                id=c.id,
                meeting_id=c.meeting_id,
                meeting_title=title,
                segment_id=c.segment_id,
                start_ms=c.start_ms,
                quote=c.quote,
            )
            for c, title in citations
        ],
    )


class ChatService:
    def __init__(
        self, uow: UnitOfWork, router: SkillRouter, clock: Callable[[], datetime] = _utcnow
    ) -> None:
        self.uow = uow
        self.router = router
        self.clock = clock

    def skills(self) -> list[ChatSkillRead]:
        return [
            ChatSkillRead(
                id=s.id, label=s.label, description=s.description, icon=s.icon, command=s.command
            )
            for s in self.router.skills
        ]

    def list(self, q: str | None, page: PageParams) -> Page[ChatThreadRead]:
        user = require_current_user(self.uow)
        threads, total = self.uow.chats.page_for_user(user.id, q, page.page_size, page.offset)
        return Page(
            items=[_thread_read(t) for t in threads],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def get(self, thread_id: int) -> ChatThreadDetail:
        thread = self._require_thread(thread_id)
        messages = self.uow.chats.messages(thread.id)
        citations = self.uow.chats.citations([m.id for m in messages])
        return ChatThreadDetail(
            **_thread_read(thread).model_dump(),
            messages=[_message_read(m, citations.get(m.id, [])) for m in messages],
        )

    def messages(self, thread_id: int, page: PageParams) -> Page[ChatMessageRead]:
        thread = self._require_thread(thread_id)
        messages, total = self.uow.chats.page_messages(thread.id, page.page_size, page.offset)
        citations = self.uow.chats.citations([m.id for m in messages])
        return Page(
            items=[_message_read(m, citations.get(m.id, [])) for m in messages],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def delete(self, thread_id: int) -> None:
        # Messages and citations go with it (ON DELETE CASCADE).
        self.uow.chats.delete(self._require_thread(thread_id))
        self.uow.commit()

    def start(
        self, data: ChatMessageCreate, *, before_ai: Callable[[], None] | None = None
    ) -> ChatExchange:
        """A new thread titled after its first question, with that question answered."""
        return self._exchange(None, data, before_ai)

    def reply(
        self,
        thread_id: int,
        data: ChatMessageCreate,
        *,
        before_ai: Callable[[], None] | None = None,
    ) -> ChatExchange:
        return self._exchange(thread_id, data, before_ai)

    def _exchange(
        self,
        thread_id: int | None,
        data: ChatMessageCreate,
        before_ai: Callable[[], None] | None,
    ) -> ChatExchange:
        """`before_ai` (the rate limiter) runs after every guard and only when the skill will
        call the AI, so rejected requests and stored-data answers cost no quota."""
        try:
            user_id = require_current_user(self.uow).id
            meeting_title: str | None = None
            if thread_id is not None:
                self._require_thread(thread_id)
            if data.meeting_id is not None:
                meeting_title = require_active_meeting(self.uow, data.meeting_id).title
            skill, question = self.router.route(data.question, data.skill)
            request = SkillRequest(question, data.meeting_id, user_id, self.clock())
            prepared = skill.prepare(self.uow, request)
            if prepared.uses_ai and before_ai is not None:
                before_ai()
        finally:
            self.uow.rollback()
        # The question is saved before the AI runs, so a failed answer never loses it.
        thread, asked = self._save_question(thread_id, user_id, data, skill, meeting_title)
        reply = prepared.finish()
        return self._save_answer(thread.id, user_id, asked, skill, reply)

    def _save_question(
        self,
        thread_id: int | None,
        user_id: int,
        data: ChatMessageCreate,
        skill: ChatSkill,
        meeting_title: str | None,
    ) -> tuple[ChatThread, ChatMessage]:
        now = self.clock()
        if thread_id is None:
            thread = self.uow.chats.add(
                ChatThread(
                    user_id=user_id,
                    title=thread_title(data.question, skill, meeting_title),
                    meeting_id=data.meeting_id,
                    created_at=now,
                    updated_at=now,
                )
            )
        else:
            thread = self._require_thread(thread_id)
            thread.updated_at = now
            if data.meeting_id is not None:
                thread.meeting_id = data.meeting_id
        asked = self.uow.chats.add_message(
            ChatMessage(thread_id=thread.id, role=ChatRole.USER, content=data.question)
        )
        self.uow.commit()
        return thread, asked

    def _save_answer(
        self,
        thread_id: int,
        user_id: int,
        asked: ChatMessage,
        skill: ChatSkill,
        reply: SkillReply,
    ) -> ChatExchange:
        # Re-read: the thread may have been deleted while the AI was working.
        thread = self.uow.chats.get_for_user(thread_id, user_id)
        if thread is None:
            raise thread_not_found()
        thread.updated_at = self.clock()
        answered = self.uow.chats.add_message(
            ChatMessage(
                thread_id=thread.id,
                role=ChatRole.ASSISTANT,
                content=reply.content,
                skill=skill.id.value,
                provider=reply.provider,
                model=reply.model,
            )
        )
        citations = [
            ChatCitation(
                message_id=answered.id,
                meeting_id=s.meeting_id,
                segment_id=s.segment_id,
                start_ms=s.start_ms,
                quote=s.quote,
            )
            for s in reply.sources
        ]
        self.uow.chats.add_citations(citations)
        self.uow.commit()
        titles = [s.meeting_title for s in reply.sources]
        return ChatExchange(
            thread=_thread_read(thread),
            user_message=_message_read(asked, []),
            assistant_message=_message_read(answered, list(zip(citations, titles, strict=True))),
        )

    def _require_thread(self, thread_id: int) -> ChatThread:
        user = require_current_user(self.uow)
        thread = self.uow.chats.get_for_user(thread_id, user.id)
        if thread is None:
            raise thread_not_found()
        return thread
