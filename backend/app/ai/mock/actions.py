"""Action items from commitment phrasing.

Four patterns, tried in order on each sentence:

1. delegation - "Can you, Dana, share the mockups by Wednesday?" -> Dana
2. first person - "I'll / I will / I'm going to / let me ..." -> the speaker
3. team need with a deadline - "We need to update the copy by Friday" -> nobody
4. explicit marker - "Action item: instrument the funnel" -> nobody

Ownership is only assigned when the phrasing makes it unambiguous; a wrong
assignee is worse than none.
"""

import re

from app.ai.mock.text_utils import sentences, words
from app.ai.types import ActionItemDraft, TranscriptForAI

_NAME = r"[A-Z][a-z]+"
_DELEGATION = re.compile(
    rf"(?:\b(?P<before>{_NAME}),\s*)?\b[Cc](?:an|ould) you"
    rf"(?:,\s*(?P<inside>{_NAME}),)?\s+(?P<task>.+?\bby\b.+?)"
    rf"(?:,\s*(?P<after>{_NAME}))?[?.!]*$"
)
_FIRST_PERSON = re.compile(
    r"\b(?:I'll|I will|I'm going to|I am going to|[Ll]et me)\s+(?P<task>.+?)[.!]*$"
)
_TEAM_NEED = re.compile(r"\b[Ww]e need to\s+(?P<task>.+?\bby\b.+?)[.!]*$")
_MARKER = re.compile(r"\b[Aa]ction item\s*[:,-]?\s*(?P<task>.+?)[.!]*$")

# "Let me know", "I'll be honest", "let me walk through": conversational or
# about the meeting itself, not commitments to future work.
_NOT_A_TASK = frozenset(
    """know be say admit think guess see tell ask bet stop pass jump interrupt clarify go
    defer need want walk recap restate summarize summarise take start repeat play push""".split()
)
_MIN_TASK_WORDS = 3


def _resolve(name: str | None, roster: dict[str, str]) -> str | None:
    if name is None:
        return None
    return roster.get(name.lower(), name)


def _roster(t: TranscriptForAI) -> dict[str, str]:
    """First names and full names -> the speaker's display name."""
    roster: dict[str, str] = {}
    for speaker in sorted({line.speaker for line in t.lines}):
        roster.setdefault(speaker.lower(), speaker)
        first = speaker.split()[0].lower() if speaker.split() else ""
        roster.setdefault(first, speaker)
    return roster


def _as_task(raw: str) -> str | None:
    task = raw.strip().rstrip("?.!,;: ")
    task = re.sub(r"^(?:just|also|then|go ahead and)\s+", "", task, flags=re.IGNORECASE)
    tokens = words(task)
    if len(tokens) < _MIN_TASK_WORDS or tokens[0] in _NOT_A_TASK:
        return None
    return task[0].upper() + task[1:]


def _match(sentence: str, speaker: str, roster: dict[str, str]) -> tuple[str, str | None] | None:
    if m := _DELEGATION.search(sentence):
        task = _as_task(m["task"])
        name = m["inside"] or m["before"] or m["after"]
        if task:
            return task, _resolve(name, roster)
    if m := _FIRST_PERSON.search(sentence):
        task = _as_task(m["task"])
        if task:
            return task, speaker
    for pattern in (_TEAM_NEED, _MARKER):
        if m := pattern.search(sentence):
            task = _as_task(m["task"])
            if task:
                return task, None
    return None


def extract_action_items(t: TranscriptForAI) -> list[ActionItemDraft]:
    roster = _roster(t)
    seen: set[str] = set()
    drafts: list[ActionItemDraft] = []
    for line in sorted(t.lines, key=lambda x: (x.start_ms, x.segment_id)):
        for sentence in sentences(line.text):
            found = _match(sentence, line.speaker, roster)
            if found is None or found[0].lower() in seen:
                continue
            seen.add(found[0].lower())
            drafts.append(ActionItemDraft(text=found[0], assignee=found[1], start_ms=line.start_ms))
    return drafts
