"""Block-based cue parsing shared by WebVTT and SubRip, which differ only in framing."""

import re

from app.parsers.base import ParsedTranscript
from app.parsers.normalise import RawCue, clock_to_ms, extract_speaker, finalise, unrecognised

_TIMING = re.compile(r"^\s*(\S+)\s*-->\s*(\S+)")
_SKIPPED_BLOCKS = ("NOTE", "STYLE", "REGION", "WEBVTT")


def parse_cue_blocks(content: str, format_name: str) -> ParsedTranscript:
    cues: list[RawCue] = []
    for block in re.split(r"\n\s*\n", content.lstrip("\ufeff").replace("\r\n", "\n").strip()):
        lines = block.strip().splitlines()
        if not lines or lines[0].startswith(_SKIPPED_BLOCKS):
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
        speaker, text = extract_speaker(" ".join(lines[index + 1 :]))
        cues.append(RawCue(speaker, start, end, text))
    if not cues:
        raise unrecognised(format_name, f"No cues with a timing line were found ({format_name}).")
    return finalise(cues, format_name)
