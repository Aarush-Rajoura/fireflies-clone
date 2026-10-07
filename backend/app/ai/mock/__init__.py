"""Deterministic, offline provider: the default, the fallback and the test double.

Each capability is a small heuristic in its own module; this class only
routes to them. Same input always yields the same output.
"""

from app.ai.mock import actions, qa, summary
from app.ai.types import ActionItemDraft, Answer, Passage, SummaryResult, TranscriptForAI

MOCK_LABEL = "mock"


class MockProvider:
    name: str = MOCK_LABEL
    model: str | None = None

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        return summary.summarize(t)

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        return actions.extract_action_items(t)

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        return qa.answer(question, passages)


__all__ = ["MOCK_LABEL", "MockProvider"]
