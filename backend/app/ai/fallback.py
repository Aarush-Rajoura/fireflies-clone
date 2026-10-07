"""Graceful degradation: try the primary provider, fall back on `ProviderError`.

Only `ProviderError` triggers the fallback - that is the provider saying "I
could not answer" (network, quota, bad output). Any other exception is a bug
and should surface, not be hidden behind mock output.

Provenance is exposed as `last_provider_label` (see `app.ai.interfaces`):
the primary's label on success, exactly `FALLBACK_LABEL` after a fallback.
It is thread-local because one instance serves concurrent requests.
"""

import logging
import threading
from collections.abc import Callable

from app.ai.interfaces import AIProvider, ProviderError, provenance_label
from app.ai.types import ActionItemDraft, Answer, Passage, SummaryResult, TranscriptForAI

FALLBACK_LABEL = "mock (llm fallback)"

logger = logging.getLogger(__name__)


class FallbackProvider:
    def __init__(self, primary: AIProvider, fallback: AIProvider) -> None:
        self._primary = primary
        self._fallback = fallback
        # Identity is the configured pipeline; per-call truth is the label.
        self.name = primary.name
        self.model = primary.model
        self._local = threading.local()

    @property
    def last_provider_label(self) -> str:
        return str(getattr(self._local, "label", self.name))

    def _run[T](self, call: Callable[[AIProvider], T]) -> T:
        try:
            result = call(self._primary)
        except ProviderError as error:
            # The cause goes to the log; the user still gets an answer.
            logger.warning("AI provider %s failed, using fallback: %s", self.name, error)
            self._local.label = FALLBACK_LABEL
            return call(self._fallback)
        self._local.label = provenance_label(self._primary)
        return result

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        return self._run(lambda p: p.summarize(t))

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        return self._run(lambda p: p.extract_action_items(t))

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        return self._run(lambda p: p.answer(question, passages))
