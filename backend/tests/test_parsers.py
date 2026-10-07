import json

import pytest

from app.core.exceptions import ValidationFailedError
from app.parsers import ParsedTranscript, default_registry
from app.parsers.json_parser import JsonParser
from app.parsers.srt import SrtParser
from app.parsers.text import TextParser
from app.parsers.vtt import VttParser

VTT = """WEBVTT

NOTE a comment

1
00:00:01.000 --> 00:00:04.500
<v Alice>Hello <i>everyone</i>.</v>

00:00:05.000 --> 00:00:08.250
Bob: Thanks for joining.

00:00:09.000 --> 00:00:10.000


01:00.5 --> 01:02.0
No speaker here
"""

SRT = """1
00:00:01,000 --> 00:00:03,500
Alice: Welcome.

2
00:01:05,250 --> 00:01:07,000
Second line
wraps here
"""


def test_vtt_voice_tags_and_prefixes() -> None:
    result = VttParser().parse(VTT)
    assert result.format == "vtt"
    assert [(s.speaker, s.start_ms, s.end_ms, s.text) for s in result.segments] == [
        ("Alice", 1000, 4500, "Hello everyone."),
        ("Bob", 5000, 8250, "Thanks for joining."),
        ("Speaker 1", 60500, 62000, "No speaker here"),
    ]
    assert any("1 empty cue" in w for w in result.warnings)
    assert not result.timings_estimated


def test_srt_comma_milliseconds() -> None:
    result = SrtParser().parse(SRT)
    assert result.format == "srt"
    assert result.segments[0].start_ms == 1000
    assert result.segments[0].end_ms == 3500
    assert result.segments[0].speaker == "Alice"
    assert result.segments[1].start_ms == 65250
    assert result.segments[1].text == "Second line wraps here"


def test_json_seconds_with_floats() -> None:
    data = [
        {"speaker": "A", "start": 0, "end": 1.5, "text": "hi"},
        {"speaker": "B", "start": 1.5, "end": 2.25, "text": "yo"},
    ]
    result = JsonParser().parse(json.dumps(data))
    assert [(s.start_ms, s.end_ms) for s in result.segments] == [(0, 1500), (1500, 2250)]


def test_json_ms_wrapped() -> None:
    data = {"segments": [{"speaker": "A", "start_ms": 10, "end_ms": 20, "text": "hi"}]}
    result = JsonParser().parse(json.dumps(data))
    assert (result.segments[0].start_ms, result.segments[0].end_ms) == (10, 20)
    assert result.format == "json"


def test_json_unknown_keys_unrecognised() -> None:
    with pytest.raises(ValidationFailedError) as exc:
        JsonParser().parse(json.dumps([{"speaker": "A", "from": 1, "to": 2, "text": "x"}]))
    assert exc.value.code == "TRANSCRIPT_UNRECOGNISED"


def test_text_bracketed() -> None:
    result = TextParser().parse("[00:00:05] Alice: Hi there\n[00:01:02] Bob: Hello\ncontinued")
    assert [(s.speaker, s.start_ms) for s in result.segments] == [("Alice", 5000), ("Bob", 62000)]
    assert result.segments[0].end_ms == 62000
    assert result.segments[1].text == "Hello continued"
    assert not result.timings_estimated


def test_text_bare_timestamps() -> None:
    result = TextParser().parse("00:01 Alice: Hi\n00:09 Bob: Yo")
    assert [s.start_ms for s in result.segments] == [1000, 9000]
    assert result.segments[1].speaker == "Bob"


def test_text_untimed_estimated_and_monotonic() -> None:
    result = TextParser().parse("Alice: " + "word " * 300 + "\nBob: short one")
    assert result.timings_estimated
    assert "timings estimated" in result.warnings
    first, second = result.segments
    assert first.end_ms - first.start_ms == 120_000
    assert second.start_ms >= first.end_ms
    assert second.end_ms > second.start_ms


def test_text_plain_paragraphs_default_speaker() -> None:
    result = TextParser().parse("Just some notes\n\nAnd more notes")
    assert {s.speaker for s in result.segments} == {"Speaker 1"}
    assert result.timings_estimated


def test_end_before_start_is_clamped() -> None:
    srt = "1\n00:00:05,000 --> 00:00:01,000\nhello there\n"
    seg = SrtParser().parse(srt).segments[0]
    assert seg.end_ms > seg.start_ms


def test_segments_sorted() -> None:
    data = [
        {"start_ms": 5000, "end_ms": 6000, "text": "b"},
        {"start_ms": 1000, "end_ms": 2000, "text": "a"},
    ]
    result = JsonParser().parse(json.dumps(data))
    assert [s.text for s in result.segments] == ["a", "b"]


@pytest.mark.parametrize("content", ["", "   \n\t\n"])
def test_empty(content: str) -> None:
    with pytest.raises(ValidationFailedError) as exc:
        default_registry().parse(content, "x.txt")
    assert exc.value.code == "TRANSCRIPT_EMPTY"


@pytest.mark.parametrize("content", ["\x00\x01\x02PK\x03\x04\x00\x00\xff\xfe" * 20, "\ufffd" * 50])
def test_garbage(content: str) -> None:
    with pytest.raises(ValidationFailedError) as exc:
        default_registry().parse(content, "x.txt")
    assert exc.value.code == "TRANSCRIPT_UNRECOGNISED"
    assert exc.value.details["format_tried"]


def test_registry_by_extension() -> None:
    reg = default_registry()
    assert reg.parse(SRT, "a.srt").format == "srt"
    assert reg.parse(VTT, "a.vtt").format == "vtt"
    assert reg.parse('[{"start":0,"end":1,"text":"x"}]', "a.json").format == "json"
    assert reg.parse("Alice: hi", "a.txt").format == "text"


def test_registry_sniffs_txt_that_is_vtt() -> None:
    reg = default_registry()
    result: ParsedTranscript = reg.parse(VTT, "notes.txt")
    assert result.format == "vtt"
    assert reg.parse(SRT, None).format == "srt"
    body = '{"segments":[{"start_ms":0,"end_ms":5,"text":"x"}]}'
    assert reg.parse(body).format == "json"
