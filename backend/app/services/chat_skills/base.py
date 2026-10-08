"""The ChatSkill strategy: one class per thing AskFred knows how to do.

A skill works in two phases so the chat service can keep the database and the
AI apart. `prepare` runs inside a short read transaction and gathers every row
it needs; the `finish` it returns runs after that transaction has ended, so a
slow AI provider never holds a SQLite lock (see ADR-004). Skills that need no
AI compose their whole answer in `prepare` and return it ready-made.
"""

import re
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import ClassVar

from app.db.unit_of_work import UnitOfWork
from app.schemas.chat import ChatSkillId


@dataclass(frozen=True)
class SkillRequest:
    question: str
    meeting_id: int | None
    user_id: int
    now: datetime


@dataclass(frozen=True)
class Source:
    """Where a statement in a reply came from: a meeting, ideally a moment in it."""

    meeting_id: int
    meeting_title: str
    segment_id: int | None
    start_ms: int | None
    quote: str


@dataclass(frozen=True)
class SkillReply:
    # Markdown-lite: `## `/`### ` headings, `- ` bullets, `**bold**`, `[n]` citation markers.
    content: str
    sources: list[Source] = field(default_factory=list)
    # Null when the reply was composed from stored data without calling an AI.
    provider: str | None = None
    model: str | None = None


@dataclass(frozen=True)
class PreparedReply:
    finish: Callable[[], SkillReply]
    # True when `finish` calls the AI, so the caller spends rate-limit quota first.
    uses_ai: bool = False

    @classmethod
    def ready(cls, reply: SkillReply) -> "PreparedReply":
        return cls(finish=lambda: reply)


class ChatSkill(ABC):
    id: ClassVar[ChatSkillId]
    label: ClassVar[str]
    description: ClassVar[str]
    icon: ClassVar[str]
    # Phrasings that pick this skill when the client names none and types no /command.
    triggers: ClassVar[tuple[re.Pattern[str], ...]] = ()

    @property
    def command(self) -> str:
        return f"/{self.id.value}"

    def matches(self, question: str) -> bool:
        return any(pattern.search(question) for pattern in self.triggers)

    @abstractmethod
    def prepare(self, uow: UnitOfWork, request: SkillRequest) -> PreparedReply:
        """Read what the reply needs. Must not write, commit or call an AI."""
