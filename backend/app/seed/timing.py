"""Deterministic line timings for seed transcripts, derived from word counts."""

from collections.abc import Sequence
from dataclasses import dataclass

WORDS_PER_MINUTE = 150
MS_PER_WORD = 60_000 // WORDS_PER_MINUTE
MIN_LINE_MS = 1_200
DEFAULT_PAUSE_MS = 400


@dataclass(frozen=True)
class TimedLine:
    speaker: str
    text: str
    start_ms: int
    end_ms: int


def line_duration_ms(text: str) -> int:
    return max(len(text.split()) * MS_PER_WORD, MIN_LINE_MS)


def time_lines(lines: Sequence[tuple[str, str, int | None]]) -> list[TimedLine]:
    """Lay lines end to end; each is (speaker, text, pause_ms after it or None for default)."""
    timed: list[TimedLine] = []
    cursor = 0
    for speaker, text, pause in lines:
        end = cursor + line_duration_ms(text)
        timed.append(TimedLine(speaker, text, cursor, end))
        cursor = end + (DEFAULT_PAUSE_MS if pause is None else pause)
    return timed


def duration_ms(timed: Sequence[TimedLine]) -> int:
    return timed[-1].end_ms if timed else 0


def talk_ms(timed: Sequence[TimedLine]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for line in timed:
        totals[line.speaker] = totals.get(line.speaker, 0) + line.end_ms - line.start_ms
    return totals
