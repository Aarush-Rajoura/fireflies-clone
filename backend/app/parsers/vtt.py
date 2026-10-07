"""WebVTT parser."""

from app.parsers.base import ParsedTranscript, extension_of
from app.parsers.cues import parse_cue_blocks


class VttParser:
    format = "vtt"

    def can_parse(self, filename: str | None, content: str) -> bool:
        return extension_of(filename) == "vtt" or content.lstrip("\ufeff").lstrip().startswith(
            "WEBVTT"
        )

    def parse(self, content: str) -> ParsedTranscript:
        return parse_cue_blocks(content, self.format)
