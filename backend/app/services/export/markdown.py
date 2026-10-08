"""CommonMark output: no raw HTML, so it pastes cleanly into GitHub or Notion."""

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


class MarkdownExporter:
    media_type = "text/markdown; charset=utf-8"
    extension = "md"

    def render(self, bundle: ExportBundle) -> bytes:
        return "".join(self._lines(bundle)).encode("utf-8")

    def _lines(self, b: ExportBundle) -> Iterator[str]:
        yield f"# {b.title}\n\n"
        for label, value in b.metadata():
            yield f"- **{label}:** {value}\n"
        for section in b.sections:
            yield f"\n## {SECTION_TITLES[section]}\n\n"
            if section is Section.SUMMARY:
                yield from _summary(b)
            elif section is Section.ACTION_ITEMS:
                yield from _tasks(b)
            else:
                yield from _transcript(b)


def _summary(b: ExportBundle) -> Iterator[str]:
    if not b.overview and not b.outline and not b.notes:
        yield f"_{NO_SUMMARY}_\n"
        return
    yield f"### Overview\n\n{b.overview}\n"
    if b.keywords:
        yield f"\n**Keywords:** {', '.join(b.keywords)}\n"
    if b.outline:
        yield "\n### Outline\n\n"
        for entry in b.outline:
            yield f"- [{clock(entry.start_ms)}] {entry.title}\n"
    for group in b.notes:
        yield f"\n### {group.title}\n\n"
        for bullet in group.bullets:
            yield f"- {bullet}\n"


def _tasks(b: ExportBundle) -> Iterator[str]:
    if not b.action_items:
        yield f"_{NO_ACTION_ITEMS}_\n"
    for task in b.action_items:
        yield f"- [{'x' if task.done else ' '}] {task.text}{task_suffix(task)}\n"


def _transcript(b: ExportBundle) -> Iterator[str]:
    if not b.transcript:
        yield f"_{NO_TRANSCRIPT}_\n"
    # A blank line between turns keeps each one its own paragraph after a paste.
    for i, line in enumerate(b.transcript):
        gap = "\n" if i else ""
        yield f"{gap}**{line.speaker}** [{clock(line.start_ms)}] {line.text}\n"
