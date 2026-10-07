"""AI layer: deterministic mock, fallback, cache, prompts and factory."""

import json
import re
from dataclasses import asdict

import pytest

from app.ai.cache import CachingProvider
from app.ai.factory import build_ai_provider
from app.ai.fallback import FALLBACK_LABEL, FallbackProvider
from app.ai.interfaces import AIProvider, ProviderError, provenance_label
from app.ai.mock import MockProvider
from app.ai.prompts import load_prompt
from app.ai.types import (
    ActionItemDraft,
    Answer,
    Passage,
    SummaryResult,
    TranscriptForAI,
    TranscriptLine,
)
from app.core.config import Settings

# (seconds, speaker, text) — three clear topics separated by long pauses.
_SCRIPT: list[tuple[int, str, str]] = [
    (0, "Priya Shah", "Thanks everyone for joining the launch planning sync today."),
    (6, "Priya Shah", "First up is the launch timeline for the mobile app release."),
    (14, "Marcus Lee", "The mobile release is on track, the beta build ships Monday."),
    (22, "Marcus Lee", "We still have two crash bugs blocking the launch timeline."),
    (31, "Priya Shah", "Can we fix the crash bugs before the beta build goes out?"),
    (38, "Marcus Lee", "Yes, I'll fix the crash bugs by Thursday."),
    (46, "Dana Ortiz", "The release notes for the mobile launch are drafted already."),
    (54, "Priya Shah", "Great, so the launch timeline holds for the end of the month."),
    (95, "Priya Shah", "Next topic is pricing, we need to settle the pricing tiers."),
    (103, "Dana Ortiz", "Customers find three pricing tiers confusing on the website."),
    (111, "Marcus Lee", "Annual billing discounts could simplify the pricing tiers."),
    (119, "Priya Shah", "I'll send the deck by Friday with the revised pricing tiers."),
    (127, "Dana Ortiz", "We need to update the pricing page copy by next week."),
    (135, "Marcus Lee", "Enterprise customers want annual billing with invoices."),
    (143, "Priya Shah", "Agreed, annual billing becomes the default pricing option."),
    (190, "Dana Ortiz", "Last item is the onboarding flow redesign for new users."),
    (198, "Dana Ortiz", "The onboarding checklist drops new users after step three."),
    (206, "Marcus Lee", "Onboarding analytics show most users skip the checklist."),
    (214, "Priya Shah", "Can you, Dana, share the onboarding mockups by Wednesday?"),
    (222, "Dana Ortiz", "Sure, the onboarding mockups will include a shorter checklist."),
    (230, "Marcus Lee", "Action item: instrument the onboarding funnel events."),
    (238, "Priya Shah", "Thanks all, let me know if anything blocks the launch."),
]


def _sample() -> TranscriptForAI:
    lines = [
        TranscriptLine(segment_id=100 + i, speaker=s, start_ms=sec * 1000, text=t)
        for i, (sec, s, t) in enumerate(_SCRIPT)
    ]
    return TranscriptForAI(meeting_title="Launch planning sync", lines=lines)


def _passages(t: TranscriptForAI) -> list[Passage]:
    return [
        Passage(
            meeting_id=1,
            meeting_title=t.meeting_title,
            segment_id=line.segment_id,
            start_ms=line.start_ms,
            speaker=line.speaker,
            text=line.text,
        )
        for line in t.lines
    ]


def _sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


# ── Mock provider ───────────────────────────────────────────────────────────


def test_mock_summary_is_byte_identical_across_runs_and_instances() -> None:
    a = MockProvider().summarize(_sample())
    b = MockProvider().summarize(_sample())
    assert json.dumps(asdict(a), sort_keys=True) == json.dumps(asdict(b), sort_keys=True)
    items_a = MockProvider().extract_action_items(_sample())
    items_b = MockProvider().extract_action_items(_sample())
    assert items_a == items_b


def test_mock_outline_starts_on_real_lines_and_increases() -> None:
    t = _sample()
    outline = MockProvider().summarize(t).outline
    starts = {line.start_ms for line in t.lines}
    assert 3 <= len(outline) <= 6
    assert all(entry.start_ms in starts for entry in outline)
    ms = [entry.start_ms for entry in outline]
    assert ms == sorted(set(ms))
    assert all(entry.title for entry in outline)


def test_mock_outline_follows_topic_shifts() -> None:
    ms = {e.start_ms for e in MockProvider().summarize(_sample()).outline}
    # The two long pauses introduce the pricing and onboarding topics.
    assert {0, 95_000, 190_000} <= ms


def test_mock_keywords_are_at_most_six_and_weighted() -> None:
    keywords = MockProvider().summarize(_sample()).keywords
    assert 1 <= len(keywords) <= 6
    assert all(0 < k.weight <= 1 for k in keywords)
    assert keywords[0].weight == 1.0
    terms = {k.term for k in keywords}
    assert any("pricing" in term for term in terms)
    # Speaker names are not topics.
    assert not any(name in term for term in terms for name in ("priya", "marcus", "dana"))


def test_mock_overview_has_two_to_five_sentences() -> None:
    summary = MockProvider().summarize(_sample())
    assert 2 <= len(_sentences(summary.overview)) <= 5


def test_mock_notes_group_per_chapter() -> None:
    summary = MockProvider().summarize(_sample())
    assert len(summary.notes) == len(summary.outline)
    assert all(group.bullets for group in summary.notes)


def test_mock_handles_empty_transcript() -> None:
    empty = TranscriptForAI(meeting_title="Empty", lines=[])
    summary = MockProvider().summarize(empty)
    assert summary.outline == [] and summary.keywords == [] and summary.notes == []
    assert summary.overview
    assert MockProvider().extract_action_items(empty) == []
    assert MockProvider().answer("anything?", []).citations == []


def test_mock_action_item_first_person_assigns_speaker() -> None:
    items = MockProvider().extract_action_items(_sample())
    deck = [i for i in items if "send the deck by friday" in i.text.lower()]
    assert deck == [
        ActionItemDraft(
            text="Send the deck by Friday with the revised pricing tiers",
            assignee="Priya Shah",
            start_ms=119_000,
        )
    ]


def test_mock_action_items_cover_commitment_patterns() -> None:
    items = {i.text: i for i in MockProvider().extract_action_items(_sample())}
    assert items["Fix the crash bugs by Thursday"].assignee == "Marcus Lee"
    mockups = next(i for t, i in items.items() if "onboarding mockups" in t)
    assert mockups.assignee == "Dana Ortiz"
    assert any("pricing page copy" in t for t in items)
    assert any("instrument the onboarding funnel" in t.lower() for t in items)
    # "let me know" is a courtesy, not a commitment.
    assert not any("know if anything" in t for t in items)


def test_mock_qa_cites_existing_segments() -> None:
    t = _sample()
    answer = MockProvider().answer("What did we decide about annual billing?", _passages(t))
    ids = {line.segment_id: line.start_ms for line in t.lines}
    assert answer.citations
    assert all(ids[c.segment_id] == c.start_ms for c in answer.citations)
    assert "annual billing" in answer.text.lower()


def test_mock_qa_without_match_has_no_citations() -> None:
    answer = MockProvider().answer("What about the quarterly tax audit?", _passages(_sample()))
    assert answer.citations == []
    assert answer.text


# ── Fallback ────────────────────────────────────────────────────────────────


class _Failing:
    name = "gemini"
    model: str | None = "gemini-x"

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        raise ProviderError("boom")

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        raise ProviderError("boom")

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        raise ProviderError("boom")


class _Counting(MockProvider):
    def __init__(self, name: str = "mock") -> None:
        self.name = name
        self.calls = 0

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        self.calls += 1
        return super().summarize(t)

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        self.calls += 1
        return super().answer(question, passages)


def test_fallback_uses_backup_on_provider_error() -> None:
    provider: AIProvider = FallbackProvider(_Failing(), MockProvider())
    result = provider.summarize(_sample())
    assert result == MockProvider().summarize(_sample())
    assert provenance_label(provider) == FALLBACK_LABEL == "mock (llm fallback)"
    assert provider.extract_action_items(_sample()) == MockProvider().extract_action_items(
        _sample()
    )
    assert provider.answer("pricing?", []) == MockProvider().answer("pricing?", [])


def test_fallback_keeps_primary_label_on_success() -> None:
    provider = FallbackProvider(_Counting(name="gemini"), MockProvider())
    provider.summarize(_sample())
    assert provider.last_provider_label == "gemini"
    assert provider.name == "gemini"


def test_fallback_does_not_swallow_other_errors() -> None:
    class _Broken(_Failing):
        def summarize(self, t: TranscriptForAI) -> SummaryResult:
            raise ValueError("bug")

    with pytest.raises(ValueError):
        FallbackProvider(_Broken(), MockProvider()).summarize(_sample())


# ── Cache ───────────────────────────────────────────────────────────────────


def test_cache_serves_identical_call_without_hitting_inner() -> None:
    inner = _Counting(name="gemini")
    cached = CachingProvider(inner)
    first = cached.summarize(_sample())
    second = cached.summarize(_sample())
    assert first == second and inner.calls == 1
    assert provenance_label(cached) == "gemini"
    cached.answer("pricing?", _passages(_sample()))
    cached.answer("pricing?", _passages(_sample()))
    assert inner.calls == 2
    cached.answer("billing?", _passages(_sample()))
    assert inner.calls == 3


def test_cache_key_changes_with_transcript() -> None:
    inner = _Counting()
    cached = CachingProvider(inner)
    cached.summarize(_sample())
    other = _sample()
    cached.summarize(TranscriptForAI(meeting_title=other.meeting_title, lines=other.lines[:-1]))
    assert inner.calls == 2


def test_cache_does_not_store_fallback_results() -> None:
    backup = _Counting()
    cached = CachingProvider(FallbackProvider(_Failing(), backup))
    cached.summarize(_sample())
    assert provenance_label(cached) == FALLBACK_LABEL
    cached.summarize(_sample())
    assert backup.calls == 2


def test_cache_hit_is_isolated_from_caller_mutation() -> None:
    cached = CachingProvider(_Counting())
    cached.summarize(_sample()).keywords.clear()
    assert cached.summarize(_sample()).keywords


# ── Prompts and factory ─────────────────────────────────────────────────────


@pytest.mark.parametrize("name", ["summary", "action_items", "qa"])
def test_prompts_are_versioned(name: str) -> None:
    prompt = load_prompt(name)
    assert prompt.version >= 1
    assert prompt.text and "version:" not in prompt.text


def test_factory_builds_mock_by_default() -> None:
    assert isinstance(build_ai_provider(Settings(ai_provider="mock")), MockProvider)


def test_factory_without_key_stays_offline() -> None:
    provider = build_ai_provider(Settings(ai_provider="gemini", ai_api_key=""))
    assert isinstance(provider, MockProvider)


def test_factory_builds_cached_fallback_pipeline_for_gemini() -> None:
    provider = build_ai_provider(Settings(ai_provider="gemini", ai_api_key="k", ai_model="m"))
    assert isinstance(provider, CachingProvider)
    assert provider.name == "gemini" and provider.model == "m"
