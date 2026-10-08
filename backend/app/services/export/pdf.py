"""PDF via reportlab's flowables, so long transcripts paginate on their own."""

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer

from app.services.export.bundle import (
    NO_ACTION_ITEMS,
    NO_SUMMARY,
    NO_TRANSCRIPT,
    SECTION_TITLES,
    ExportBundle,
    Section,
    task_suffix,
)
from app.services.timefmt import clock

# A PDF cannot read the app's CSS tokens; these mirror the light theme's accent and muted ink.
_ACCENT = HexColor("#6A39EF")
_MUTED = HexColor("#5B6475")


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("t", parent=base["Title"], alignment=0, spaceAfter=4),
        "meta": ParagraphStyle("m", parent=base["Normal"], textColor=_MUTED, fontSize=9),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], textColor=_ACCENT, spaceBefore=12),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], spaceBefore=6),
        "body": ParagraphStyle("b", parent=base["Normal"], leading=14),
        "bullet": ParagraphStyle("li", parent=base["Normal"], leftIndent=12, leading=14),
        "muted": ParagraphStyle("em", parent=base["Italic"], textColor=_MUTED),
    }


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    # Paragraph parses a mini-markup, so user text must be escaped.
    return Paragraph(escape(text), style)


class PdfExporter:
    media_type = "application/pdf"
    extension = "pdf"

    def render(self, bundle: ExportBundle) -> bytes:
        out = BytesIO()
        doc = SimpleDocTemplate(
            out,
            pagesize=A4,
            title=bundle.title,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
        )
        doc.build(self._flowables(bundle, _styles()))
        return out.getvalue()

    def _flowables(self, b: ExportBundle, s: dict[str, ParagraphStyle]) -> list[Flowable]:
        story: list[Flowable] = [_p(b.title, s["title"])]
        story += [_p(f"{label}: {value}", s["meta"]) for label, value in b.metadata()]
        for section in b.sections:
            story.append(_p(SECTION_TITLES[section], s["h2"]))
            if section is Section.SUMMARY:
                story += _summary(b, s)
            elif section is Section.ACTION_ITEMS:
                story += _tasks(b, s)
            else:
                story += _transcript(b, s)
        return story


def _summary(b: ExportBundle, s: dict[str, ParagraphStyle]) -> list[Flowable]:
    if not b.overview and not b.outline and not b.notes:
        return [_p(NO_SUMMARY, s["muted"])]
    out: list[Flowable] = [_p("Overview", s["h3"]), _p(b.overview, s["body"])]
    if b.keywords:
        out += [Spacer(1, 4), _p(f"Keywords: {', '.join(b.keywords)}", s["meta"])]
    if b.outline:
        out.append(_p("Outline", s["h3"]))
        out += [_p(f"[{clock(e.start_ms)}] {e.title}", s["bullet"]) for e in b.outline]
    for group in b.notes:
        out.append(_p(group.title, s["h3"]))
        out += [_p(f"• {bullet}", s["bullet"]) for bullet in group.bullets]
    return out


def _tasks(b: ExportBundle, s: dict[str, ParagraphStyle]) -> list[Flowable]:
    if not b.action_items:
        return [_p(NO_ACTION_ITEMS, s["muted"])]
    return [
        # ASCII boxes: the built-in Helvetica has no ballot-box glyphs.
        _p(f"[{'x' if t.done else ' '}] {t.text}{task_suffix(t)}", s["bullet"])
        for t in b.action_items
    ]


def _transcript(b: ExportBundle, s: dict[str, ParagraphStyle]) -> list[Flowable]:
    if not b.transcript:
        return [_p(NO_TRANSCRIPT, s["muted"])]
    return [
        Paragraph(
            f"<b>{escape(line.speaker)}</b> <font color='#5B6475'>[{clock(line.start_ms)}]</font> "
            f"{escape(line.text)}",
            s["body"],
        )
        for line in b.transcript
    ]
