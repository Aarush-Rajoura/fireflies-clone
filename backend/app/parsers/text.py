"""Plain-text parser: bracketed timestamps, bare timestamps, then speaker-only lines."""

import re

from app.parsers.base import ParsedTranscript
from app.parsers.normalise import (
    RawCue,
    clock_to_ms,
    estimate_duration_ms,
    extract_speaker,
    finalise,
    prefixes_allowed,
    unrecognised,
)

_CLOCK = r"\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?"
_BRACKETED = re.compile(rf"^\[({_CLOCK})\]\s*(.*)$")
_BARE = re.compile(rf"^({_CLOCK})\s+(.*)$")


def looks_binary(content: str) -> bool:
    """NULs or many control/replacement characters mean this is not prose."""
    if "\x00" in content:
        return True
    odd = sum(1 for ch in content if ch == "\ufffd" or (ch < " " and ch not in "\t\n\r"))
    return odd > max(1, len(content) // 20)


def _timed_cues(lines: list[str]) -> list[RawCue] | None:
    """Cues for lines with leading timestamps; None when no line has one."""
    cues: list[RawCue] = []
    saw_time = False
    matches = [_BRACKETED.match(line) or _BARE.match(line) for line in lines]
    allow = prefixes_allowed([m.group(2) for m in matches if m])
    for line, match in zip(lines, matches, strict=True):
        start = clock_to_ms(match.group(1)) if match else None
        if match and start is not None:
            saw_time = True
            speaker, text = extract_speaker(match.group(2), allow_prefix=allow)
            cues.append(RawCue(speaker, start, None, text))
        elif cues:
            last = cues[-1]
            cues[-1] = RawCue(last.speaker, last.start_ms, None, f"{last.text} {line}")
        else:
            cues.append(RawCue(None, 0, None, line))
    if not saw_time:
        return None
    # A cue lasts until the next starts; the last one is estimated by finalise().
    ends = [c.start_ms for c in cues[1:]] + [None]
    return [
        RawCue(c.speaker, c.start_ms, end if end is not None and end > c.start_ms else None, c.text)
        for c, end in zip(cues, ends, strict=True)
    ]


def _untimed_cues(lines: list[str]) -> list[RawCue]:
    """Speaker lines (continuations join the previous one), else one cue per line."""
    named = prefixes_allowed(lines)
    pieces: list[tuple[str | None, str]] = []
    for line in lines:
        speaker, text = extract_speaker(line) if named else (None, line)
        if named and speaker is None and pieces:
            pieces[-1] = (pieces[-1][0], f"{pieces[-1][1]} {text}")
        else:
            pieces.append((speaker, text))
    cues: list[RawCue] = []
    cursor = 0
    for speaker, text in pieces:
        end = cursor + estimate_duration_ms(text)
        cues.append(RawCue(speaker, cursor, end, text))
        cursor = end
    return cues


class TextParser:
    format = "text"

    def can_parse(self, filename: str | None, content: str) -> bool:
        return bool(content.strip()) and not looks_binary(content)

    def parse(self, content: str) -> ParsedTranscript:
        if looks_binary(content):
            raise unrecognised(self.format, "The content looks binary, not text.")
        lines = [
            ln.strip()
            for ln in content.lstrip("\ufeff").replace("\r", "\n").splitlines()
            if ln.strip()
        ]
        timed = _timed_cues(lines)
        if timed is not None:
            return finalise(timed, self.format)
        return finalise(_untimed_cues(lines), self.format, estimated=True)
