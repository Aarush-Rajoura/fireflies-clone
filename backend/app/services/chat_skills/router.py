"""Chooses the skill for a question: the one the client names, a leading /command,
a skill whose trigger phrase matches, or else a free question."""

import re
from collections.abc import Sequence

from app.schemas.chat import ChatSkillId
from app.services.chat_skills.base import ChatSkill

_COMMAND = re.compile(r"^\s*/([a-z][\w-]*)(?:\s+(.*))?$", re.I | re.S)


class SkillRouter:
    def __init__(self, skills: Sequence[ChatSkill], fallback: ChatSkill) -> None:
        self.skills = list(skills)
        self.fallback = fallback
        self._by_id = {s.id: s for s in [*self.skills, fallback]}

    def route(self, question: str, skill: ChatSkillId | None = None) -> tuple[ChatSkill, str]:
        """The skill and the question it should answer, with any /command stripped off."""
        if skill is not None:
            return self._by_id[skill], question
        command = _COMMAND.match(question)
        if command:
            named = self._find(command.group(1))
            if named is not None:
                rest = (command.group(2) or "").strip()
                return named, rest or named.label
        for candidate in self.skills:
            if candidate.matches(question):
                return candidate, question
        return self.fallback, question

    def _find(self, name: str) -> ChatSkill | None:
        try:
            return self._by_id[ChatSkillId(name.lower())]
        except ValueError:
            return None
