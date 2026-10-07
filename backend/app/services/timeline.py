"""Positions in a recording: snapping AI-reported times onto real transcript lines."""

import bisect
import dataclasses
from collections.abc import Iterable, Sequence

from app.ai.types import SummaryResult


def line_starts(starts: Iterable[int]) -> list[int]:
    """Sorted, de-duplicated line starts; client order and overlapping cues are not sorted."""
    return sorted(set(starts))


def snap(start_ms: int | None, starts: Sequence[int]) -> int | None:
    """Move a position to the start of the line containing it, so clicks land on a line.

    `starts` must come from `line_starts`.
    """
    if start_ms is None or not starts:
        return start_ms
    return starts[max(bisect.bisect_right(starts, start_ms) - 1, 0)]


def snap_summary(result: SummaryResult, starts: Sequence[int]) -> SummaryResult:
    outline = [
        dataclasses.replace(e, start_ms=snap(e.start_ms, starts) or 0) for e in result.outline
    ]
    return dataclasses.replace(result, outline=outline)
