"""SubRip parser."""

import re

from app.parsers.base import ParsedTranscript, extension_of
from app.parsers.cues import parse_cue_blocks

_SRT_HEAD = re.compile(r"^\s*\d+\s*\n\s*\d{1,2}:\d{2}:\d{2},\d{1,3}\s*-->", re.MULTILINE)


class SrtParser:
    format = "srt"

    def can_parse(self, filename: str | None, content: str) -> bool:
        return extension_of(filename) == "srt" or bool(_SRT_HEAD.search(content[:2000]))

    def parse(self, content: str) -> ParsedTranscript:
        return parse_cue_blocks(content, self.format)
