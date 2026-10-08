"""Meeting export: validate the request, load one bundle, hand it to the chosen exporter."""

from dataclasses import dataclass, replace

from app.core.exceptions import ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, Participant
from app.models.enums import ActionItemStatus, SectionKind
from app.services.export.bundle import (
    ALL_SECTIONS,
    ExportBundle,
    NoteBlock,
    OutlineLine,
    Section,
    SpokenLine,
    TaskLine,
)
from app.services.export.filename import export_filename
from app.services.export.registry import ExporterRegistry
from app.services.guards import require_active_meeting
from app.services.transcript_text import speaker_name


@dataclass(frozen=True)
class ExportFile:
    filename: str
    media_type: str
    content: bytes


def parse_sections(raw: str | None) -> tuple[Section, ...]:
    """Comma-separated section names; None means all. Always returned in document order."""
    if raw is None:
        return ALL_SECTIONS
    names = {part.strip().lower() for part in raw.split(",") if part.strip()}
    unknown = sorted(names - {s.value for s in Section})
    if unknown or not names:
        raise ValidationFailedError(
            "Unknown or empty export sections",
            code="EXPORT_SECTION_UNKNOWN",
            details={"unknown": unknown, "supported": [s.value for s in ALL_SECTIONS]},
        )
    return tuple(s for s in ALL_SECTIONS if s.value in names)


class ExportService:
    def __init__(self, uow: UnitOfWork, exporters: ExporterRegistry) -> None:
        self.uow = uow
        self.exporters = exporters

    def export(self, meeting_id: int, fmt: str, sections: str | None = None) -> ExportFile:
        exporter = self.exporters.get(fmt)
        chosen = parse_sections(sections)
        meeting = require_active_meeting(self.uow, meeting_id)
        return ExportFile(
            filename=export_filename(meeting.title, meeting.started_at.date(), exporter.extension),
            media_type=exporter.media_type,
            content=exporter.render(self.bundle(meeting, chosen)),
        )

    def bundle(self, meeting: Meeting, sections: tuple[Section, ...]) -> ExportBundle:
        """Loads only what the chosen sections need."""
        participants = self.uow.participants.list_for_meeting(meeting.id)
        people = {p.id: p for p in participants}
        bundle = ExportBundle(
            title=meeting.title,
            started_at=meeting.started_at,
            duration_ms=meeting.duration_ms,
            participants=tuple(p.display_name for p in participants),
            sections=sections,
        )
        if Section.SUMMARY in sections:
            bundle = self._with_summary(bundle, meeting.id)
        if Section.ACTION_ITEMS in sections:
            bundle = replace(bundle, action_items=self._tasks(meeting.id, people))
        if Section.TRANSCRIPT in sections:
            bundle = replace(bundle, transcript=self._transcript(meeting.id, people))
        return bundle

    def _with_summary(self, bundle: ExportBundle, meeting_id: int) -> ExportBundle:
        summary = self.uow.summaries.get_by_meeting(meeting_id)
        if summary is None:
            return bundle
        rows = self.uow.summaries.sections(summary.id)
        terms = self.uow.summaries.keyword_terms([meeting_id]).get(meeting_id, [])
        return replace(
            bundle,
            overview=summary.overview,
            keywords=tuple(terms),
            outline=tuple(
                OutlineLine(r.start_ms or 0, r.title) for r in rows if r.kind == SectionKind.OUTLINE
            ),
            notes=tuple(
                NoteBlock(r.title, tuple(ln.strip() for ln in r.body.splitlines() if ln.strip()))
                for r in rows
                if r.kind == SectionKind.NOTES
            ),
        )

    def _tasks(self, meeting_id: int, people: dict[int, Participant]) -> tuple[TaskLine, ...]:
        def assignee(pid: int | None) -> str | None:
            who = people.get(pid) if pid is not None else None
            return who.display_name if who else None

        return tuple(
            TaskLine(
                text=item.text,
                done=item.status == ActionItemStatus.COMPLETED,
                assignee=assignee(item.assignee_participant_id),
                start_ms=item.start_ms,
            )
            for item in self.uow.action_items.list_for_meeting(meeting_id)
        )

    def _transcript(
        self, meeting_id: int, people: dict[int, Participant]
    ) -> tuple[SpokenLine, ...]:
        names = {s.id: speaker_name(s, people) for s in self.uow.transcript.speakers(meeting_id)}
        return tuple(
            SpokenLine(names.get(seg.speaker_id, "Unknown"), seg.start_ms, seg.text)
            for seg in self.uow.transcript.segments(meeting_id)
        )
