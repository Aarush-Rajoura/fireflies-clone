"""GeminiProvider: Google Gemini over its REST API.

Plain `httpx` rather than the vendor SDK: one endpoint is used, and an
injected client lets tests run against `httpx.MockTransport`.

- Structured output: every call sends `responseMimeType: application/json`
  plus a `responseSchema`, and the reply is validated with pydantic, so
  parsing is validation rather than regex-on-prose.
- Failures: 20s timeout, one retry on 429/5xx/timeouts/transport errors;
  anything else (4xx, blocked or malformed output) raises `ProviderError`
  straight away. The API key travels in the `x-goog-api-key` header, never the
  URL, so it cannot leak into logs or error messages.
- Long transcripts: past `chunk_words` words the transcript is split into
  consecutive chunks, each summarised (or mined for action items) on its own,
  and the results are merged locally: overviews concatenated and trimmed to 5
  sentences, outlines/notes concatenated, keywords merged by best weight. A
  second "merge" call would read better but doubles cost and latency.
- Model output is not trusted for positions: outline `start_ms` is snapped to
  the latest real line at or before it, and duplicates are dropped.
"""

import bisect
import re
import time
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from app.ai.interfaces import ProviderError
from app.ai.prompts import Prompt, load_prompt
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
    TranscriptLine,
)

GEMINI_LABEL = "gemini"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
TIMEOUT_S = 20.0
MAX_RETRIES = 1
CHUNK_WORDS = 12_000
MAX_KEYWORDS = 6
MAX_CHAPTERS = 6
MAX_OVERVIEW_SENTENCES = 5
_RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
EMPTY_OVERVIEW = "This meeting has no transcript to summarise yet."
NO_ANSWER = "I couldn't find anything in the meeting that answers that question."


# Wire models: what Gemini must return, validated before anything is trusted.
class _Outline(BaseModel):
    title: str
    start_ms: int


class _Notes(BaseModel):
    title: str
    bullets: list[str]


class _Keyword(BaseModel):
    term: str
    weight: float


class _Summary(BaseModel):
    overview: str
    outline: list[_Outline]
    notes: list[_Notes]
    keywords: list[_Keyword]


class _Action(BaseModel):
    text: str
    assignee: str | None = None
    segment_id: int | None = None


class _Actions(BaseModel):
    action_items: list[_Action]


class _Cite(BaseModel):
    passage: int
    quote: str


class _Answer(BaseModel):
    answer: str
    citations: list[_Cite]


# Gemini's responseSchema is an OpenAPI subset, so these are written by hand.
def _obj(props: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {"type": "OBJECT", "properties": props, "required": required or list(props)}


def _arr(items: dict[str, Any]) -> dict[str, Any]:
    return {"type": "ARRAY", "items": items}


_STR: dict[str, Any] = {"type": "STRING"}
_INT: dict[str, Any] = {"type": "INTEGER"}
_SUMMARY_SCHEMA = _obj(
    {
        "overview": _STR,
        "outline": _arr(_obj({"title": _STR, "start_ms": _INT})),
        "notes": _arr(_obj({"title": _STR, "bullets": _arr(_STR)})),
        "keywords": _arr(_obj({"term": _STR, "weight": {"type": "NUMBER"}})),
    }
)
_ACTIONS_SCHEMA = _obj(
    {
        "action_items": _arr(
            _obj(
                {
                    "text": _STR,
                    "assignee": {"type": "STRING", "nullable": True},
                    "segment_id": {"type": "INTEGER", "nullable": True},
                },
                required=["text"],
            )
        )
    }
)
_ANSWER_SCHEMA = _obj({"answer": _STR, "citations": _arr(_obj({"passage": _INT, "quote": _STR}))})


def _word_count(text: str) -> int:
    return len(text.split())


def chunk_lines(lines: list[TranscriptLine], max_words: int) -> list[list[TranscriptLine]]:
    """Consecutive line groups of at most ~max_words words (a line is never split)."""
    chunks: list[list[TranscriptLine]] = [[]]
    size = 0
    for line in lines:
        n = _word_count(line.text)
        if chunks[-1] and size + n > max_words:
            chunks.append([])
            size = 0
        chunks[-1].append(line)
        size += n
    return [c for c in chunks if c]


def _evenly(items: list[OutlineEntry], k: int) -> list[OutlineEntry]:
    if len(items) <= k:
        return items
    step = (len(items) - 1) / (k - 1)
    return [items[round(i * step)] for i in range(k)]


def _snap_outline(entries: list[OutlineEntry], starts: list[int]) -> list[OutlineEntry]:
    # Model order is kept: an entry that does not move forward in time after
    # snapping is a duplicate or out of order, and is dropped.
    snapped: list[OutlineEntry] = []
    for entry in entries:
        i = bisect.bisect_right(starts, entry.start_ms) - 1
        ms = starts[max(i, 0)]
        if not snapped or ms > snapped[-1].start_ms:
            snapped.append(OutlineEntry(title=entry.title.strip(), start_ms=ms))
    return _evenly(snapped, MAX_CHAPTERS)


def _merge_keywords(keywords: list[_Keyword]) -> list[KeywordResult]:
    best: dict[str, float] = {}
    for k in keywords:
        term = k.term.strip().lower()
        if term:
            best[term] = max(best.get(term, 0.0), min(max(k.weight, 0.01), 1.0))
    ranked = sorted(best.items(), key=lambda kv: (-kv[1], kv[0]))[:MAX_KEYWORDS]
    return [KeywordResult(term=t, weight=round(w, 3)) for t, w in ranked]


def _trim_sentences(text: str, limit: int) -> str:
    parts = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
    return " ".join(parts[:limit])


class GeminiProvider:
    name: str = GEMINI_LABEL

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_GEMINI_MODEL,
        *,
        client: httpx.Client | None = None,
        timeout_s: float = TIMEOUT_S,
        retry_backoff_s: float = 0.5,
        chunk_words: int = CHUNK_WORDS,
    ) -> None:
        self.model: str | None = model
        self._api_key = api_key
        self._client = client or httpx.Client()
        self._timeout = timeout_s
        self._backoff = retry_backoff_s
        self._chunk_words = chunk_words

    def __repr__(self) -> str:  # never show the key
        return f"GeminiProvider(model={self.model!r})"

    @property
    def last_provider_label(self) -> str:
        return GEMINI_LABEL

    # ── transport ──────────────────────────────────────────────────────────

    def _post(self, body: dict[str, Any]) -> httpx.Response:
        url = f"{GEMINI_BASE_URL}/models/{self.model}:generateContent"
        headers = {"x-goog-api-key": self._api_key}
        failure = "no attempt made"
        for attempt in range(MAX_RETRIES + 1):
            if attempt:
                time.sleep(self._backoff)
            try:
                response = self._client.post(url, json=body, headers=headers, timeout=self._timeout)
            except httpx.TransportError as error:  # includes every timeout
                failure = f"transport error ({type(error).__name__})"
                continue
            if response.status_code in _RETRYABLE_STATUS:
                failure = f"HTTP {response.status_code}"
                continue
            if response.is_error:
                raise ProviderError(f"Gemini returned HTTP {response.status_code}")
            return response
        raise ProviderError(f"Gemini request failed after retry: {failure}")

    def _generate[M: BaseModel](
        self, prompt: Prompt, content: str, schema: dict[str, Any], out: type[M]
    ) -> M:
        body = {
            "systemInstruction": {"parts": [{"text": prompt.text}]},
            "contents": [{"role": "user", "parts": [{"text": content}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
                "temperature": 0.2,
            },
        }
        response = self._post(body)
        try:
            parts = response.json()["candidates"][0]["content"]["parts"]
            text = "".join(str(part.get("text", "")) for part in parts)
            return out.model_validate_json(text)
        except (ValueError, KeyError, IndexError, TypeError, AttributeError) as error:
            # ValidationError and JSONDecodeError are both ValueErrors.
            kind = "invalid output" if isinstance(error, ValidationError) else "unreadable reply"
            raise ProviderError(f"Gemini returned {kind}: {type(error).__name__}") from None

    # ── capabilities ───────────────────────────────────────────────────────

    def _chunks(self, t: TranscriptForAI) -> list[list[TranscriptLine]]:
        lines = sorted(t.lines, key=lambda line: (line.start_ms, line.segment_id))
        return chunk_lines(lines, self._chunk_words)

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        chunks = self._chunks(t)
        if not chunks:
            return SummaryResult(overview=EMPTY_OVERVIEW, outline=[], notes=[], keywords=[])
        prompt = load_prompt("summary")
        parts = [
            self._generate(
                prompt,
                f"Meeting title: {t.meeting_title}\n\nTranscript:\n"
                + "\n".join(f"[{x.start_ms}] {x.speaker}: {x.text}" for x in chunk),
                _SUMMARY_SCHEMA,
                _Summary,
            )
            for chunk in chunks
        ]
        starts = sorted({line.start_ms for line in t.lines})
        outline = [OutlineEntry(o.title, o.start_ms) for p in parts for o in p.outline]
        return SummaryResult(
            overview=_trim_sentences(" ".join(p.overview for p in parts), MAX_OVERVIEW_SENTENCES),
            outline=_snap_outline(outline, starts),
            notes=[NoteGroup(n.title, list(n.bullets)) for p in parts for n in p.notes],
            keywords=_merge_keywords([k for p in parts for k in p.keywords]),
        )

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        prompt = load_prompt("action_items")
        start_of = {line.segment_id: line.start_ms for line in t.lines}
        drafts: list[ActionItemDraft] = []
        for chunk in self._chunks(t):
            content = "\n".join(f"[{x.segment_id}] {x.speaker}: {x.text}" for x in chunk)
            result = self._generate(prompt, content, _ACTIONS_SCHEMA, _Actions)
            for item in result.action_items:
                if not item.text.strip():
                    continue
                start = start_of.get(item.segment_id) if item.segment_id is not None else None
                assignee = (item.assignee or "").strip() or None
                drafts.append(ActionItemDraft(item.text.strip(), assignee, start))
        return drafts

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        # Callers pass passages best-first, so a budget cut keeps the useful ones.
        kept: list[Passage] = []
        budget = self._chunk_words
        for p in passages:
            budget -= _word_count(p.text)
            if budget < 0 and kept:
                break
            kept.append(p)
        if not kept:
            return Answer(text=NO_ANSWER, citations=[])
        listing = "\n".join(
            f"[P{i}] ({p.meeting_title}, {p.speaker or 'summary'}) {p.text}"
            for i, p in enumerate(kept, start=1)
        )
        result = self._generate(
            load_prompt("qa"),
            f"Question: {question}\n\nPassages:\n{listing}",
            _ANSWER_SCHEMA,
            _Answer,
        )
        citations: list[Citation] = []
        for cite in result.citations:
            if not 1 <= cite.passage <= len(kept):
                continue  # the model cited a passage that does not exist
            p = kept[cite.passage - 1]
            if p.segment_id is None or p.start_ms is None:
                continue  # a summary has no moment in a recording to seek to
            if all(c.segment_id != p.segment_id for c in citations):
                citations.append(Citation(p.segment_id, p.start_ms, cite.quote.strip()))
        return Answer(text=result.answer.strip(), citations=citations)
