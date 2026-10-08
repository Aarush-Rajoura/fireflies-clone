"""Hand-written AI stubs implementing the capability Protocols for service tests."""

from collections.abc import Callable

from app.ai.interfaces import ProviderError
from app.ai.types import (
    ActionItemDraft,
    Answer,
    Citation,
    KeywordResult,
    NoteGroup,
    OutlineEntry,
    Passage,
    SummaryResult,
    TranscriptForAI,
)


def summary_result(
    tag: str = "v1", provider: str = "stub", model: str | None = "stub-1"
) -> SummaryResult:
    return SummaryResult(
        overview=f"Overview {tag}",
        outline=[OutlineEntry(f"Intro {tag}", 0), OutlineEntry(f"Plan {tag}", 1500)],
        notes=[NoteGroup(f"Decisions {tag}", ["ship it", "test it"])],
        keywords=[KeywordResult(f"alpha-{tag}", 0.9), KeywordResult(f"beta-{tag}", 0.4)],
        provider=provider,
        model=model,
    )


class StubSummarizer:
    def __init__(
        self,
        result: SummaryResult | None = None,
        *,
        fail: bool = False,
        on_call: Callable[[TranscriptForAI], None] | None = None,
    ) -> None:
        self.result = result or summary_result()
        self.fail = fail
        self.on_call = on_call
        self.calls: list[TranscriptForAI] = []

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        self.calls.append(t)
        if self.on_call is not None:
            self.on_call(t)
        if self.fail:
            raise ProviderError("provider down")
        return self.result


class StubExtractor:
    def __init__(
        self,
        drafts: list[ActionItemDraft] | None = None,
        *,
        on_call: Callable[[TranscriptForAI], None] | None = None,
    ) -> None:
        self.drafts = drafts if drafts is not None else []
        self.on_call = on_call
        self.calls: list[TranscriptForAI] = []

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        self.calls.append(t)
        if self.on_call is not None:
            self.on_call(t)
        return self.drafts


class StubAnswerer:
    """Cites the given segment ids (real or invented) and records what it was asked."""

    def __init__(
        self,
        cite: list[int] | None = None,
        *,
        fail: bool = False,
        on_call: Callable[[list[Passage]], None] | None = None,
    ) -> None:
        self.cite = cite or []
        self.fail = fail
        self.on_call = on_call
        self.calls: list[tuple[str, list[Passage]]] = []

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        self.calls.append((question, passages))
        if self.on_call is not None:
            self.on_call(passages)
        if self.fail:
            raise ProviderError("provider down")
        citations = [Citation(segment_id=s, start_ms=-1, quote="") for s in self.cite]
        return Answer("stub answer", citations, provider="stub", model="stub-1")
