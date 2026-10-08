"""Capability interfaces.

Services depend on the one capability they use (`Summarizer`,
`ActionItemExtractor`, `QuestionAnswerer`); `AIProvider` is only the union a
concrete provider implements.

Provenance (who produced a result) is carried on `SummaryResult.provider`
and `Answer.provider`; action items carry none.
"""

from typing import Protocol

from app.ai.types import ActionItemDraft, Answer, Passage, SummaryResult, TranscriptForAI
from app.core.exceptions import ServiceUnavailableError


class ProviderError(ServiceUnavailableError):
    """A provider could not produce a usable result (network, quota, bad output).

    A ServiceUnavailableError, so an unwrapped provider failure renders as 503
    AI_UNAVAILABLE through the shared AppError handler. The client sees a generic
    message; `reason` (also `str(error)`) is for logs only.
    """

    code = "AI_UNAVAILABLE"
    default_message = "The AI provider is unavailable"

    def __init__(self, reason: str) -> None:
        super().__init__()
        self.reason = reason

    def __str__(self) -> str:
        return self.reason


class Summarizer(Protocol):
    def summarize(self, t: TranscriptForAI) -> SummaryResult: ...


class ActionItemExtractor(Protocol):
    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]: ...


class QuestionAnswerer(Protocol):
    # Passages rather than one transcript, so the same interface serves a single
    # meeting's Ask (its lines) and cross-meeting search (hits + summaries).
    def answer(self, question: str, passages: list[Passage]) -> Answer: ...


class AIProvider(Summarizer, ActionItemExtractor, QuestionAnswerer, Protocol):
    name: str
    model: str | None
