"""In-process response cache so identical input never re-bills the LLM.

Key = sha256(provider + model + capability + prompt version + full input).
The full input (ids, timestamps, speakers) rather than just the words, because
two transcripts with the same text but different timing need different
outlines. Prompt versions are in the key, so editing a prompt invalidates only
what it produced.

Fallback results (`provider == FALLBACK_LABEL`) are never stored: they are a
degraded answer, and caching one would keep serving mock output after the LLM
recovers. Action items carry no provenance, so a fallback list cannot be told
apart from a real one; they are therefore passed through uncached (one call
per meeting creation, so little is lost).

Process-local LRU on purpose: a miss costs one provider call, which does not
justify a table, a migration and eviction jobs.
"""

import copy
import hashlib
import json
import threading
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import asdict
from typing import cast

from app.ai.fallback import FALLBACK_LABEL
from app.ai.interfaces import AIProvider
from app.ai.prompts import load_prompt
from app.ai.types import ActionItemDraft, Answer, Passage, SummaryResult, TranscriptForAI


def cache_key(*parts: str) -> str:
    # Length-prefixed so ("ab", "c") and ("a", "bc") cannot collide.
    digest = hashlib.sha256()
    for part in parts:
        encoded = part.encode("utf-8")
        digest.update(f"{len(encoded)}:".encode("ascii"))
        digest.update(encoded)
    return digest.hexdigest()


_Cacheable = SummaryResult | Answer


class CachingProvider:
    def __init__(self, inner: AIProvider, maxsize: int = 256) -> None:
        self._inner = inner
        self._maxsize = maxsize
        self._entries: OrderedDict[str, _Cacheable] = OrderedDict()
        # FastAPI runs sync endpoints in a threadpool against this one instance.
        self._lock = threading.Lock()
        self.name = inner.name
        self.model = inner.model

    def _through[T: _Cacheable](
        self, capability: str, payload: object, compute: Callable[[], T]
    ) -> T:
        key = cache_key(
            self.name,
            self.model or "",
            capability,
            str(load_prompt(capability).version),
            json.dumps(payload, sort_keys=True, ensure_ascii=False),
        )
        with self._lock:
            hit = self._entries.get(key)
            if hit is not None:
                self._entries.move_to_end(key)
        if hit is not None:
            # Copies both ways: results hold lists, and one caller mutating a
            # shared instance would corrupt every later hit.
            return cast(T, copy.deepcopy(hit))
        value = compute()
        if value.provider != FALLBACK_LABEL:
            with self._lock:
                self._entries[key] = copy.deepcopy(value)
                self._entries.move_to_end(key)
                while len(self._entries) > self._maxsize:
                    self._entries.popitem(last=False)
        return value

    def summarize(self, t: TranscriptForAI) -> SummaryResult:
        return self._through("summary", asdict(t), lambda: self._inner.summarize(t))

    def extract_action_items(self, t: TranscriptForAI) -> list[ActionItemDraft]:
        return self._inner.extract_action_items(t)

    def answer(self, question: str, passages: list[Passage]) -> Answer:
        payload = {"question": question, "passages": [asdict(p) for p in passages]}
        return self._through("qa", payload, lambda: self._inner.answer(question, passages))
