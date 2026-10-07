"""AI layer: deterministic mock, fallback, cache, prompts and factory."""

import dataclasses
import json
import os
import re
import subprocess
import sys
from dataclasses import asdict
from pathlib import Path

import pytest

from app.ai.cache import CachingProvider
from app.ai.factory import build_ai_provider
from app.ai.fallback import FALLBACK_LABEL, FallbackProvider
from app.ai.interfaces import AIProvider, ProviderError
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


_TOPICS = [
    ["database", "migration", "schema", "postgres", "rollback", "indexes"],
    ["candidate", "interview", "offer", "recruiter", "salary", "onsite"],
    ["campaign", "webinar", "newsletter", "signup", "audience", "budget"],
    ["security", "audit", "vulnerability", "penetration", "firewall", "compliance"],
]
_PEOPLE = ["Priya Shah", "Marcus Lee", "Dana Ortiz"]


# A rambling opening: every line brings new words, like a real status round.
_RAMBLE = (
    "laptop coffee parking badge elevator printer weather traffic holiday lunch "
    "keyboard monitor chair desk plant window heating lighting carpet kitchen fridge "
    "microwave kettle mugs posters whiteboard markers stapler envelopes stamps courier "
    "reception visitors umbrella bicycle shower lockers garden terrace rooftop lobby signage"
).split()


def _four_topics() -> TranscriptForAI:
    """55 evenly paced lines (no pauses to lean on), 4 topics, names said aloud.

    The first topic's vocabulary churns line to line while the others repeat
    themselves, so a purely "where does the vocabulary change most" picker
    would pile every boundary into the opening.
    """
    lines: list[TranscriptLine] = []
    sizes = [14, 14, 14, 13]
    for t_index, (topic, size) in enumerate(zip(_TOPICS, sizes, strict=True)):
        for k in range(size):
            i = len(lines)
            if t_index == 0:
                a, b = _RAMBLE[3 * k], _RAMBLE[3 * k + 1]
                c = topic[k % len(topic)]
            else:
                a, b, c = (topic[(k + j) % len(topic)] for j in range(3))
            other = _PEOPLE[(i + 1) % 3].split()[0]
            text = f"{other}, the {a} {b} work is moving, and the {c} question is open."
            lines.append(TranscriptLine(i, _PEOPLE[i % 3], i * 8000, text))
    return TranscriptForAI(meeting_title="Weekly sync", lines=lines)


def _chapter_sizes(t: TranscriptForAI, starts: list[int]) -> list[int]:
    line_starts = [line.start_ms for line in t.lines]
    idx = [line_starts.index(ms) for ms in starts]
    return [b - a for a, b in zip(idx, [*idx[1:], len(line_starts)], strict=True)]


def test_mock_outline_spreads_chapters_over_a_long_meeting() -> None:
    t = _four_topics()
    outline = MockProvider().summarize(t).outline
    sizes = _chapter_sizes(t, [e.start_ms for e in outline])
    assert len(outline) >= 4
    assert max(sizes) <= len(t.lines) / 2
    assert min(sizes) >= 5


def test_mock_titles_are_never_speaker_names() -> None:
    names = {p.lower() for p in _PEOPLE} | {p.split()[0].lower() for p in _PEOPLE}
    for t in (_four_topics(), _sample()):
        titles = [e.title.lower() for e in MockProvider().summarize(t).outline]
        assert not any(word in names for title in titles for word in [title, *title.split()])


def test_mock_is_stable_across_hash_seeds() -> None:
    # Set iteration order changes with PYTHONHASHSEED; output must not.
    code = (
        "import json,sys; from dataclasses import asdict; sys.path.insert(0,'tests');"
        "from test_ai import _four_topics, _sample; from app.ai.mock import MockProvider;"
        "m=MockProvider(); print(json.dumps([asdict(m.summarize(_four_topics())),"
        "asdict(m.summarize(_sample()))]))"
    )
    backend = Path(__file__).resolve().parents[1]
    outputs = {
        subprocess.run(
            [sys.executable, "-c", code],
            cwd=backend,
            env={**os.environ, "PYTHONHASHSEED": seed},
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        for seed in ("1", "2", "3")
    }
    assert len(outputs) == 1


def test_mock_splits_two_commitments_in_one_sentence() -> None:
    line = "I'll deploy the rate limits by Monday, and I'll run a load test the day after."
    t = TranscriptForAI("Ops", [TranscriptLine(1, "Arjun Rao", 5000, line)])
    assert MockProvider().extract_action_items(t) == [
        ActionItemDraft("Deploy the rate limits by Monday", "Arjun Rao", 5000),
        ActionItemDraft("Run a load test the day after", "Arjun Rao", 5000),
    ]


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
    """The mock, counting calls and stamping its own name like a real provider."""

    def __init__(self, name: str = "mock") -> None:
        self.name = name
        self.calls = 0

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        self.calls += 1
        return dataclasses.replace(super().summarize(t), provider=self.name)

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        self.calls += 1
        return super().extract_action_items(t)

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        self.calls += 1
        return dataclasses.replace(super().answer(question, passages), provider=self.name)


def test_mock_results_are_stamped_mock() -> None:
    assert MockProvider().summarize(_sample()).provider == "mock"
    assert MockProvider().answer("pricing?", []).provider == "mock"
    assert MockProvider().summarize(_sample()).model is None


def test_fallback_uses_backup_on_provider_error() -> None:
    provider: AIProvider = FallbackProvider(_Failing(), MockProvider())
    result = provider.summarize(_sample())
    expected = MockProvider().summarize(_sample())
    assert result == dataclasses.replace(expected, provider=FALLBACK_LABEL, model=None)
    assert result.provider == FALLBACK_LABEL == "mock (llm fallback)"
    assert provider.extract_action_items(_sample()) == MockProvider().extract_action_items(
        _sample()
    )
    answer = provider.answer("pricing?", [])
    assert answer.provider == FALLBACK_LABEL and answer.model is None
    assert answer.text == MockProvider().answer("pricing?", []).text


def test_fallback_keeps_primary_result_on_success() -> None:
    provider = FallbackProvider(_Counting(name="gemini"), MockProvider())
    assert provider.summarize(_sample()).provider == "gemini"
    assert provider.answer("pricing?", _passages(_sample())).provider == "gemini"
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
    assert second.provider == "gemini"
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
    assert cached.summarize(_sample()).provider == FALLBACK_LABEL
    assert cached.summarize(_sample()).provider == FALLBACK_LABEL
    assert backup.calls == 2
    cached.answer("pricing?", [])
    cached.answer("pricing?", [])
    assert backup.calls == 4


def test_cache_passes_action_items_through() -> None:
    # A list of drafts carries no provenance, so a fallback list could not be
    # told apart from a real one; they are deliberately never cached.
    inner = _Counting()
    cached = CachingProvider(inner)
    cached.extract_action_items(_sample())
    cached.extract_action_items(_sample())
    assert inner.calls == 2


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
