"""The format-neutral snapshot of a meeting that every exporter renders from.

Exporters never touch the database: the service loads one `ExportBundle` and each
format only decides how to draw it.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class Section(StrEnum):
    SUMMARY = "summary"
    ACTION_ITEMS = "action_items"
    TRANSCRIPT = "transcript"


# Document order, whatever order the client listed them in.
ALL_SECTIONS: tuple[Section, ...] = (Section.SUMMARY, Section.ACTION_ITEMS, Section.TRANSCRIPT)


@dataclass(frozen=True)
class OutlineLine:
    start_ms: int
    title: str


@dataclass(frozen=True)
class NoteBlock:
    title: str
    bullets: tuple[str, ...]


@dataclass(frozen=True)
class TaskLine:
    text: str
    done: bool
    assignee: str | None
    start_ms: int | None


@dataclass(frozen=True)
class SpokenLine:
    speaker: str
    start_ms: int
    text: str


@dataclass(frozen=True)
class ExportBundle:
    title: str
    started_at: datetime
    duration_ms: int
    participants: tuple[str, ...]
    sections: tuple[Section, ...]
    overview: str = ""
    keywords: tuple[str, ...] = ()
    outline: tuple[OutlineLine, ...] = ()
    notes: tuple[NoteBlock, ...] = ()
    action_items: tuple[TaskLine, ...] = ()
    transcript: tuple[SpokenLine, ...] = ()

    def metadata(self) -> list[tuple[str, str]]:
        rows = [
            ("Date", self.started_at.strftime("%Y-%m-%d %H:%M UTC")),
            ("Duration", clock(self.duration_ms)),
        ]
        if self.participants:
            rows.append(("Participants", ", ".join(self.participants)))
        return rows


def clock(ms: int) -> str:
    """`MM:SS`, or `H:MM:SS` past the hour: formatting belongs to the presentation edge."""
    hours, rest = divmod(ms // 1000, 3600)
    minutes, seconds = divmod(rest, 60)
    return f"{hours}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"


def task_suffix(task: TaskLine) -> str:
    parts = []
    if task.assignee:
        parts.append(task.assignee)
    if task.start_ms is not None:
        parts.append(f"at {clock(task.start_ms)}")
    return f" ({', '.join(parts)})" if parts else ""


NO_SUMMARY = "No summary has been generated for this meeting."
NO_ACTION_ITEMS = "No action items."
NO_TRANSCRIPT = "This meeting has no transcript."

SECTION_TITLES = {
    Section.SUMMARY: "Summary",
    Section.ACTION_ITEMS: "Action items",
    Section.TRANSCRIPT: "Transcript",
}
