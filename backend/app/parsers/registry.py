"""Chooses a parser by extension, falling back to content sniffing."""

from collections.abc import Sequence

from app.parsers.base import ParsedTranscript, TranscriptParser, extension_of
from app.parsers.errors import TranscriptEmptyError, TranscriptUnrecognisedError
from app.parsers.json_parser import JsonParser
from app.parsers.srt import SrtParser
from app.parsers.text import TextParser
from app.parsers.vtt import VttParser

_FORMAT_BY_EXTENSION = {"vtt": "vtt", "srt": "srt", "json": "json", "txt": "text"}


class ParserRegistry:
    def __init__(self, parsers: Sequence[TranscriptParser]) -> None:
        self._parsers = list(parsers)

    def parse(self, content: str, filename: str | None = None) -> ParsedTranscript:
        body = content.lstrip("\ufeff")
        if not body.strip():
            raise TranscriptEmptyError("The transcript is empty.")

        preferred = _FORMAT_BY_EXTENSION.get(extension_of(filename))
        if preferred == "text":
            preferred = None  # .txt is generic: let sniffing find a stricter format first
        # The extension is only a hint: a mislabelled file must still parse.
        ordered = sorted(self._parsers, key=lambda p: p.format != preferred)
        tried: list[str] = []
        for parser in ordered:
            if not parser.can_parse(filename, body):
                continue
            tried.append(parser.format)
            try:
                return parser.parse(body)
            except TranscriptUnrecognisedError:
                continue
        raise TranscriptUnrecognisedError(
            "Could not recognise this transcript. Supported formats: .txt, .vtt, .srt, .json.",
            details={"format_tried": tried or [p.format for p in ordered]},
        )


def default_registry() -> ParserRegistry:
    # Order matters for sniffing: strict formats before the permissive text fallback.
    return ParserRegistry([VttParser(), SrtParser(), JsonParser(), TextParser()])
