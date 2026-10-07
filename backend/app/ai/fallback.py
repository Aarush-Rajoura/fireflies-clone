"""Graceful degradation: try the primary provider, fall back on `ProviderError`.

Only `ProviderError` triggers the fallback - that is the provider saying "I
could not answer" (network, quota, bad output). Any other exception is a bug
and should surface, not be hidden behind mock output.

Fallback summaries and answers are re-stamped `provider=FALLBACK_LABEL,
model=None`, so the UI can say the LLM was unavailable. Action items carry no
provenance and pass through unchanged.
"""

import dataclasses
import logging
from collections.abc import Callable

from app.ai.interfaces import AIProvider, ProviderError
from app.ai.types import ActionItemDraft, Answer, Passage, SummaryResult, TranscriptForAI

FALLBACK_LABEL = "mock (llm fallback)"

logger = logging.getLogger(__name__)


class FallbackProvider:
    def __init__(self, primary: AIProvider, fallback: AIProvider) -> None:
        self._primary = primary
        self._fallback = fallback
        # Identity is the configured pipeline; per-result truth is `provider`.
        self.name = primary.name
        self.model = primary.model

    def _run[T](self, call: Callable[[AIProvider], T], stamp: Callable[[T], T]) -> T:
        try:
            return call(self._primary)
        except ProviderError as error:
            # The cause goes to the log; the user still gets an answer.
            logger.warning("AI provider %s failed, using fallback: %s", self.name, error)
            return stamp(call(self._fallback))

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        return self._run(
            lambda p: p.summarize(t),
            lambda r: dataclasses.replace(r, provider=FALLBACK_LABEL, model=None),
        )

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        return self._run(lambda p: p.extract_action_items(t), lambda r: r)

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        return self._run(
            lambda p: p.answer(question, passages),
            lambda r: dataclasses.replace(r, provider=FALLBACK_LABEL, model=None),
        )
