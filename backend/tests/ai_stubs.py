"""Hand-written AI stubs implementing the capability Protocols for service tests."""

from collections.abc import Callable

from app.ai.interfaces import ProviderError
from app.ai.types import (
    ActionItemDraft,
    KeywordResult,
    NoteGroup,
    OutlineEntry,
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
