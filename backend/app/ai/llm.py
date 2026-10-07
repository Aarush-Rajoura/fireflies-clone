"""GeminiProvider: Google Gemini over its REST API.

Plain `httpx` rather than the vendor SDK: one endpoint is used, and an
injected client lets tests run against `httpx.MockTransport`.

- Structured output: every call sends `responseMimeType: application/json`
  plus a `responseSchema`, and the reply is validated with pydantic, so
  parsing is validation rather than regex-on-prose. Blocked, malformed or
  wrongly shaped output raises `ProviderError`.
- Latency and retries live in `llm_transport` (one 25s budget per request).
- Long transcripts (> `chunk_words` words) are summarised per chunk and
  merged locally (`llm_merge`); action items are mined per chunk.
- Summaries and answers are stamped `provider="gemini"` plus the model.
"""

import time
from collections.abc import Callable
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from app.ai.interfaces import ProviderError
from app.ai.llm_merge import (
    ChunkSummary,
    chunk_lines,
    merge_chapters,
    merge_keywords,
    merge_overviews,
)
from app.ai.llm_transport import REQUEST_BUDGET_S, TIMEOUT_S, GeminiTransport
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
CHUNK_WORDS = 12_000
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


class GeminiProvider:
    name: str = GEMINI_LABEL

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_GEMINI_MODEL,
        *,
        client: httpx.Client | None = None,
        timeout_s: float = TIMEOUT_S,
        budget_s: float = REQUEST_BUDGET_S,
        retry_backoff_s: float = 0.5,
        chunk_words: int = CHUNK_WORDS,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.model: str | None = model
        self._model = model  # the protocol allows None; requests need the name
        self._transport = GeminiTransport(
            api_key,
            client,
            timeout_s=timeout_s,
            budget_s=budget_s,
            retry_backoff_s=retry_backoff_s,
            clock=clock,
            sleep=sleep,
        )
        self._chunk_words = chunk_words

    def __repr__(self) -> str:  # never show the key
        return f"GeminiProvider(model={self.model!r})"

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
        response = self._transport.post(self._model, body)
        try:
            parts = response.json()["candidates"][0]["content"]["parts"]
            text = "".join(str(part.get("text", "")) for part in parts)
            return out.model_validate_json(text)
        except (ValueError, KeyError, IndexError, TypeError, AttributeError) as error:
            # ValidationError and JSONDecodeError are both ValueErrors.
            kind = "invalid output" if isinstance(error, ValidationError) else "unreadable reply"
            raise ProviderError(f"Gemini returned {kind}: {type(error).__name__}") from None

    def _chunks(self, t: TranscriptForAI) -> list[list[TranscriptLine]]:
        lines = sorted(t.lines, key=lambda line: (line.start_ms, line.segment_id))
        return chunk_lines(lines, self._chunk_words)

    def _summarize_chunk(self, title: str, chunk: list[TranscriptLine]) -> ChunkSummary:
        transcript = "\n".join(f"[{x.start_ms}] {x.speaker}: {x.text}" for x in chunk)
        out = self._generate(
            load_prompt("summary"),
            f"Meeting title: {title}\n\nTranscript:\n{transcript}",
            _SUMMARY_SCHEMA,
            _Summary,
        )
        return ChunkSummary(
            overview=out.overview,
            outline=[OutlineEntry(o.title, o.start_ms) for o in out.outline],
            notes=[NoteGroup(n.title.strip(), list(n.bullets)) for n in out.notes],
            keywords=[KeywordResult(k.term, k.weight) for k in out.keywords],
        )

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        chunks = self._chunks(t)
        if not chunks:
            return SummaryResult(EMPTY_OVERVIEW, [], [], [], GEMINI_LABEL, self.model)
        parts = [self._summarize_chunk(t.meeting_title, chunk) for chunk in chunks]
        outline, notes = merge_chapters(parts, sorted({line.start_ms for line in t.lines}))
        return SummaryResult(
            overview=merge_overviews([p.overview for p in parts]),
            outline=outline,
            notes=notes,
            keywords=merge_keywords([k for p in parts for k in p.keywords]),
            provider=GEMINI_LABEL,
            model=self.model,
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
            budget -= len(p.text.split())
            if budget < 0 and kept:
                break
            kept.append(p)
        if not kept:
            return Answer(NO_ANSWER, [], GEMINI_LABEL, self.model)
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
        return Answer(result.answer.strip(), citations, GEMINI_LABEL, self.model)
