"""JSON parser: `start_ms`/`end_ms` are milliseconds, `start`/`end` are seconds."""

import json
import math
from typing import Any

from app.parsers.base import ParsedTranscript, extension_of
from app.parsers.normalise import RawCue, finalise, unrecognised


def _number(value: Any) -> float | None:
    # bool is an int subclass; `true` is not a timestamp.
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    try:
        number = float(value)
    except OverflowError:
        return None
    return number if math.isfinite(number) else None


def _time(item: dict[str, Any], key: str) -> int | None:
    """Unit comes from the key name, never guessed from magnitude."""
    millis = _number(item.get(f"{key}_ms"))
    if millis is not None:
        return round(millis)
    seconds = _number(item.get(key))
    if seconds is None or not math.isfinite(seconds * 1000):
        return None
    return round(seconds * 1000)


def _speaker(value: Any) -> str | None:
    if isinstance(value, dict):
        value = value.get("name")
    return value if isinstance(value, str) else None


class JsonParser:
    format = "json"

    def can_parse(self, filename: str | None, content: str) -> bool:
        return extension_of(filename) == "json" or content.lstrip("\ufeff").lstrip()[:1] in (
            "[",
            "{",
        )

    def parse(self, content: str) -> ParsedTranscript:
        try:
            payload = json.loads(content.lstrip("\ufeff"))
        except (ValueError, RecursionError, OverflowError) as error:
            raise unrecognised(self.format, f"Invalid JSON: {error}") from error
        items = payload.get("segments") if isinstance(payload, dict) else payload
        if not isinstance(items, list) or not items:
            raise unrecognised(self.format, "Expected an array of segments or {segments: [...]}.")

        cues: list[RawCue] = []
        warnings: list[str] = []
        for item in items:
            start = _time(item, "start") if isinstance(item, dict) else None
            if start is None:
                raise unrecognised(
                    self.format, "Each segment needs a numeric start_ms (ms) or start (seconds)."
                )
            speaker = _speaker(item.get("speaker"))
            if speaker is None and item.get("speaker") is not None:
                warnings.append("unreadable speaker replaced with default")
            text = item.get("text")
            cues.append(
                RawCue(
                    speaker,
                    start,
                    _time(item, "end"),
                    text if isinstance(text, str) else "",
                )
            )
        return finalise(cues, self.format, warnings=sorted(set(warnings)))
