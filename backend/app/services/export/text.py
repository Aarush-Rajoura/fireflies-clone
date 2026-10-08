"""Plain text: readable in any editor or email body, headings underlined."""

from collections.abc import Iterator

from app.services.export.bundle import (
    NO_ACTION_ITEMS,
    NO_SUMMARY,
    NO_TRANSCRIPT,
    SECTION_TITLES,
    ExportBundle,
    Section,
    clock,
    task_suffix,
)


def _heading(text: str, rule: str) -> str:
    return f"{text}\n{rule * len(text)}\n"


class TextExporter:
    media_type = "text/plain; charset=utf-8"
    extension = "txt"

    def render(self, bundle: ExportBundle) -> bytes:
        return "".join(self._lines(bundle)).encode("utf-8")

    def _lines(self, b: ExportBundle) -> Iterator[str]:
        yield _heading(b.title, "=")
        for label, value in b.metadata():
            yield f"{label}: {value}\n"
        for section in b.sections:
            yield "\n\n" + _heading(SECTION_TITLES[section], "-")
            if section is Section.SUMMARY:
                yield from _summary(b)
            elif section is Section.ACTION_ITEMS:
                yield from _tasks(b)
            else:
                yield from _transcript(b)


def _summary(b: ExportBundle) -> Iterator[str]:
    if not b.overview and not b.outline and not b.notes:
        yield f"{NO_SUMMARY}\n"
        return
    yield f"Overview\n{b.overview}\n"
    if b.keywords:
        yield f"\nKeywords: {', '.join(b.keywords)}\n"
    if b.outline:
        yield "\nOutline\n"
        for entry in b.outline:
            yield f"  [{clock(entry.start_ms)}] {entry.title}\n"
    for group in b.notes:
        yield f"\n{group.title}\n"
        for bullet in group.bullets:
            yield f"  * {bullet}\n"


def _tasks(b: ExportBundle) -> Iterator[str]:
    if not b.action_items:
        yield f"{NO_ACTION_ITEMS}\n"
    for task in b.action_items:
        yield f"[{'x' if task.done else ' '}] {task.text}{task_suffix(task)}\n"


def _transcript(b: ExportBundle) -> Iterator[str]:
    if not b.transcript:
        yield f"{NO_TRANSCRIPT}\n"
    for line in b.transcript:
        yield f"[{clock(line.start_ms)}] {line.speaker}: {line.text}\n"
