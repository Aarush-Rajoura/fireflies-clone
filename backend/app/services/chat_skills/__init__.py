"""AskFred's skills. Adding one means a new ChatSkill class and an entry in
`default_router`; the router and the chat service need no change."""

from app.ai.interfaces import QuestionAnswerer
from app.services.chat_skills.action_items import ActionItemsThisWeekSkill
from app.services.chat_skills.base import (
    ChatSkill,
    PreparedReply,
    SkillReply,
    SkillRequest,
    Source,
)
from app.services.chat_skills.digest import WeeklyDigestSkill
from app.services.chat_skills.free_question import FreeQuestionSkill
from app.services.chat_skills.prepare import PrepareUpcomingSkill
from app.services.chat_skills.router import SkillRouter
from app.services.chat_skills.summarize import SummarizeMeetingSkill

__all__ = [
    "ActionItemsThisWeekSkill", "ChatSkill", "FreeQuestionSkill", "PrepareUpcomingSkill",
    "PreparedReply", "SkillReply", "SkillRequest", "SkillRouter", "Source",
    "SummarizeMeetingSkill", "WeeklyDigestSkill", "default_router",
]  # fmt: skip


def default_router(answerer: QuestionAnswerer) -> SkillRouter:
    # Order matters for trigger phrases: the first skill whose phrase matches wins.
    return SkillRouter(
        [
            ActionItemsThisWeekSkill(),
            SummarizeMeetingSkill(),
            PrepareUpcomingSkill(),
            WeeklyDigestSkill(),
        ],
        fallback=FreeQuestionSkill(answerer),
    )
