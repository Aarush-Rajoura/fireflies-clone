"""GeminiProvider against a fake HTTP transport — no network."""

import json
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from app.ai.interfaces import ProviderError
from app.ai.llm import GeminiProvider
from app.ai.types import (
    ActionItemDraft,
    Citation,
    KeywordResult,
    OutlineEntry,
    Passage,
    TranscriptForAI,
    TranscriptLine,
)

_T = TranscriptForAI(
    meeting_title="Pricing review",
    lines=[
        TranscriptLine(segment_id=1, speaker="Ana", start_ms=0, text="Let's review pricing."),
        TranscriptLine(segment_id=2, speaker="Ben", start_ms=4000, text="Three tiers confuse."),
        TranscriptLine(segment_id=3, speaker="Ana", start_ms=9000, text="I'll send the deck."),
    ],
)

_SUMMARY = {
    "overview": "The team reviewed pricing. Ana will send the deck.",
    "outline": [
        {"title": "Pricing", "start_ms": 0},
        {"title": "Tiers", "start_ms": 4500},  # not a real line: snapped to 4000
        {"title": "Dup", "start_ms": 4000},  # duplicate after snapping: dropped
    ],
    "notes": [{"title": "Pricing", "bullets": ["Three tiers confuse customers"]}],
    "keywords": [{"term": f"k{i}", "weight": 1 - i / 10} for i in range(8)],
}


def _gemini_body(payload: object) -> dict[str, Any]:
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}


def _provider(
    handler: Callable[[httpx.Request], httpx.Response], **kwargs: Any
) -> tuple[GeminiProvider, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    client = httpx.Client(transport=httpx.MockTransport(record))
    provider = GeminiProvider(
        api_key="secret-key", model="gemini-test", client=client, retry_backoff_s=0, **kwargs
    )
    return provider, seen


def test_valid_json_is_parsed_into_summary() -> None:
    provider, seen = _provider(lambda r: httpx.Response(200, json=_gemini_body(_SUMMARY)))
    result = provider.summarize(_T)
    assert result.overview.startswith("The team reviewed pricing")
    assert result.outline == [OutlineEntry("Pricing", 0), OutlineEntry("Tiers", 4000)]
    assert len(result.keywords) == 6
    assert result.keywords[0] == KeywordResult("k0", 1.0)
    request = seen[0]
    assert request.url.path.endswith("/models/gemini-test:generateContent")
    assert request.headers["x-goog-api-key"] == "secret-key"
    assert "secret-key" not in str(request.url)
    body = json.loads(request.content)
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert "responseSchema" in body["generationConfig"]
    assert provider.last_provider_label == "gemini"


def test_action_items_map_segment_to_start_ms() -> None:
    payload = {
        "action_items": [
            {"text": "Send the deck", "assignee": "Ana", "segment_id": 3},
            {"text": "Unknown segment", "assignee": None, "segment_id": 99},
        ]
    }
    provider, _ = _provider(lambda r: httpx.Response(200, json=_gemini_body(payload)))
    assert provider.extract_action_items(_T) == [
        ActionItemDraft("Send the deck", "Ana", 9000),
        ActionItemDraft("Unknown segment", None, None),
    ]


def test_answer_maps_passage_citations() -> None:
    passages = [
        Passage(1, "Pricing review", 2, 4000, "Ben", "Three tiers confuse."),
        Passage(1, "Pricing review", None, None, None, "Summary: pricing was reviewed."),
    ]
    payload = {
        "answer": "Ben said three tiers confuse customers.",
        "citations": [
            {"passage": 1, "quote": "Three tiers confuse."},
            {"passage": 2, "quote": "no segment, not citable"},
            {"passage": 7, "quote": "out of range"},
        ],
    }
    provider, _ = _provider(lambda r: httpx.Response(200, json=_gemini_body(payload)))
    answer = provider.answer("What confuses?", passages)
    assert answer.text.startswith("Ben said")
    assert answer.citations == [Citation(2, 4000, "Three tiers confuse.")]


def test_invalid_json_raises_provider_error() -> None:
    body = {"candidates": [{"content": {"parts": [{"text": "not json {"}]}}]}
    provider, _ = _provider(lambda r: httpx.Response(200, json=body))
    with pytest.raises(ProviderError):
        provider.summarize(_T)


def test_wrong_shape_raises_provider_error() -> None:
    provider, _ = _provider(lambda r: httpx.Response(200, json=_gemini_body({"overview": 3})))
    with pytest.raises(ProviderError):
        provider.summarize(_T)


def test_blocked_response_without_candidates_raises() -> None:
    provider, _ = _provider(lambda r: httpx.Response(200, json={"promptFeedback": {}}))
    with pytest.raises(ProviderError):
        provider.summarize(_T)


def test_server_error_retries_once_then_raises() -> None:
    provider, seen = _provider(lambda r: httpx.Response(500, json={"error": "x"}))
    with pytest.raises(ProviderError) as info:
        provider.summarize(_T)
    assert len(seen) == 2
    assert "secret-key" not in str(info.value)


def test_retry_recovers_from_one_rate_limit() -> None:
    responses = iter([httpx.Response(429), httpx.Response(200, json=_gemini_body(_SUMMARY))])
    provider, seen = _provider(lambda r: next(responses))
    assert provider.summarize(_T).overview
    assert len(seen) == 2


def test_client_error_is_not_retried() -> None:
    provider, seen = _provider(lambda r: httpx.Response(400))
    with pytest.raises(ProviderError):
        provider.summarize(_T)
    assert len(seen) == 1


def test_timeout_raises_provider_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    provider, seen = _provider(handler)
    with pytest.raises(ProviderError):
        provider.summarize(_T)
    assert len(seen) == 2


def test_long_transcript_is_chunked_and_merged() -> None:
    chunk_payloads = iter(
        [
            {**_SUMMARY, "outline": [{"title": "Start", "start_ms": 0}]},
            {**_SUMMARY, "outline": [{"title": "Later", "start_ms": 9000}]},
        ]
    )
    provider, seen = _provider(
        lambda r: httpx.Response(200, json=_gemini_body(next(chunk_payloads))), chunk_words=6
    )
    result = provider.summarize(_T)
    assert len(seen) == 2
    assert [e.start_ms for e in result.outline] == [0, 9000]
    assert len(result.keywords) <= 6
    assert result.overview
