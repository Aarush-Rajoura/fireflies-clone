"""Capability interfaces.

Services depend on the one capability they use (`Summarizer`,
`ActionItemExtractor`, `QuestionAnswerer`); `AIProvider` is only the union a
concrete provider implements.

Provenance: results carry no provider field, so each provider exposes
`last_provider_label` - the label of whoever produced the result of the
caller's most recent call ("mock", "gemini" or "mock (llm fallback)"). Wrappers
keep it per thread because one provider instance serves FastAPI's threadpool.
Read it with `provenance_label(provider)` right after the call.
"""

from typing import Protocol, runtime_checkable

from app.ai.types import ActionItemDraft, Answer, Passage, SummaryResult, TranscriptForAI


class ProviderError(RuntimeError):
    """A provider could not produce a usable result (network, quota, bad output)."""


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


@runtime_checkable
class ProvenanceAware(Protocol):
    @property
    def last_provider_label(self) -> str: ...


def provenance_label(provider: object) -> str:
    """Who produced the caller's latest result; plain providers report their name."""
    if isinstance(provider, ProvenanceAware):
        return provider.last_provider_label
    return str(getattr(provider, "name", "unknown"))
