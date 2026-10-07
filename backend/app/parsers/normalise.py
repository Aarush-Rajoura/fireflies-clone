"""Rules every parser shares, so all formats yield the same normalised shape."""

import re
from dataclasses import dataclass

from app.parsers.base import ParsedSegment, ParsedTranscript
from app.parsers.errors import TranscriptUnrecognisedError

DEFAULT_SPEAKER = "Speaker 1"
WORDS_PER_MINUTE = 150
MIN_DURATION_MS = 1000

_VOICE_TAG = re.compile(r"<v(?:\.[\w.-]+)?\s+([^>]+)>", re.IGNORECASE)
# Includes VTT timestamp tags (<00:00:01.500>) and closers (</c>).
_ANY_TAG = re.compile(r"<(?:/[a-zA-Z][^>]*|[a-zA-Z\d][^>]*)>")
_LABEL_STOPLIST = frozenset(
    "note re q1 q2 q3 q4 action important todo fyi update summary agenda question answer".split()
)
# Bounded to a few capitalised words so "the point is: we ship" is not a speaker.
_NAME_CHAR = r"[\w.'\u2019-]"
_SPEAKER_PREFIX = re.compile(
    rf"^([A-Z]{_NAME_CHAR}*(?:\s+[A-Z0-9]{_NAME_CHAR}*){{0,3}})\s*:\s+(\S.*)$", re.DOTALL
)
_CLOCK = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?")


@dataclass(frozen=True)
class RawCue:
    """A cue before normalisation; `end_ms` is None when the source has no end."""

    speaker: str | None
    start_ms: int
    end_ms: int | None
    text: str


def estimate_duration_ms(text: str) -> int:
    words = max(1, len(text.split()))
    return max(MIN_DURATION_MS, round(words / WORDS_PER_MINUTE * 60_000))


def clock_to_ms(value: str) -> int | None:
    """`[hh:]mm:ss[.mmm]` (dot or comma) to milliseconds."""
    match = _CLOCK.fullmatch(value.strip())
    if not match:
        return None
    hours, minutes, seconds, fraction = match.groups()
    # Padded rather than cast: ".5" is 500 ms, not 5.
    millis = int((fraction or "0").ljust(3, "0"))
    return ((int(hours or 0) * 60 + int(minutes)) * 60 + int(seconds)) * 1000 + millis


def clean_text(text: str) -> str:
    return " ".join(_ANY_TAG.sub("", text).split())


def _prefix_match(cleaned: str) -> re.Match[str] | None:
    match = _SPEAKER_PREFIX.match(cleaned)
    if match and match.group(1).strip().lower() not in _LABEL_STOPLIST:
        return match
    return None


def has_speaker_prefix(text: str) -> bool:
    return _VOICE_TAG.search(text) is not None or _prefix_match(clean_text(text)) is not None


def extract_speaker(text: str, *, allow_prefix: bool = True) -> tuple[str | None, str]:
    """Split `<v Name>` voice tags or a `Name: ` prefix from the text.

    Callers pass allow_prefix=False when fewer than two lines carry a prefix:
    one stray "Note: ..." is prose, not a speaker.
    """
    voice = _VOICE_TAG.search(text)
    cleaned = clean_text(text)
    if voice:
        return voice.group(1).strip(), cleaned
    prefix = _prefix_match(cleaned) if allow_prefix else None
    if prefix:
        return prefix.group(1).strip(), prefix.group(2).strip()
    return None, cleaned


def prefixes_allowed(texts: list[str]) -> bool:
    return sum(has_speaker_prefix(t) for t in texts) >= 2


def unrecognised(format_name: str, message: str) -> TranscriptUnrecognisedError:
    return TranscriptUnrecognisedError(message, details={"format_tried": [format_name]})


def finalise(
    cues: list[RawCue],
    format_name: str,
    *,
    estimated: bool = False,
    warnings: list[str] | None = None,
) -> ParsedTranscript:
    """Strip, drop empties, default speakers, repair ends, sort."""
    notes = list(warnings or [])
    kept = [cue for cue in cues if cue.text.strip()]
    if dropped := len(cues) - len(kept):
        notes.append(f"{dropped} empty {'cue' if dropped == 1 else 'cues'} dropped")
    if not kept:
        raise unrecognised(format_name, f"No transcript content found in {format_name} input.")

    repaired = 0
    segments: list[ParsedSegment] = []
    for cue in sorted(kept, key=lambda c: max(0, c.start_ms)):
        start = max(0, cue.start_ms)
        text = cue.text.strip()
        end = cue.end_ms
        if end is None or end < start:
            end = start + estimate_duration_ms(text)
            repaired += 1
        segments.append(
            ParsedSegment((cue.speaker or "").strip() or DEFAULT_SPEAKER, start, end, text)
        )
    if repaired:
        notes.append(f"{repaired} missing or invalid end times estimated")
    if estimated:
        notes.append("timings estimated")
    return ParsedTranscript(segments, format_name, estimated, notes)
