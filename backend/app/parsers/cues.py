"""Block-based cue parsing shared by WebVTT and SubRip, which differ only in framing."""

import re

from app.parsers.base import ParsedTranscript
from app.parsers.normalise import (
    RawCue,
    clock_to_ms,
    extract_speaker,
    finalise,
    prefixes_allowed,
    unrecognised,
)

_TIMING = re.compile(r"^\s*(\S+)\s*-->\s*(\S+)")
_SKIPPED_BLOCKS = re.compile(r"^(NOTE|STYLE|REGION)(\s|$)")


def parse_cue_blocks(content: str, format_name: str) -> ParsedTranscript:
    parsed: list[tuple[int, int | None, str]] = []
    normalised = content.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    for block in re.split(r"\n\s*\n", normalised.strip()):
        lines = block.strip().splitlines()
        if not lines or _SKIPPED_BLOCKS.match(lines[0]):
            continue
        # The identifier/number line before the timing line is ignored.
        index = next((i for i, line in enumerate(lines) if _TIMING.match(line)), None)
        if index is None:
            continue
        match = _TIMING.match(lines[index])
        assert match is not None
        start, end = clock_to_ms(match.group(1)), clock_to_ms(match.group(2))
        if start is None:
            continue
        parsed.append((start, end, " ".join(lines[index + 1 :])))
    if not parsed:
        raise unrecognised(format_name, f"No cues with a timing line were found ({format_name}).")
    allow = prefixes_allowed([payload for _, _, payload in parsed])
    cues: list[RawCue] = []
    for start, end, payload in parsed:
        speaker, text = extract_speaker(payload, allow_prefix=allow)
        cues.append(RawCue(speaker, start, end, text))
    return finalise(cues, format_name)
