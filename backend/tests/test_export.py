import base64
import re
import zlib
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import ValidationFailedError
from app.services.export import ExportBundle, ExporterRegistry, Section, default_exporters
from app.services.export.bundle import OutlineLine, SpokenLine, TaskLine
from app.services.export.filename import export_filename, slugify
from app.services.export.service import parse_sections

V1 = "/api/v1"

BUNDLE = ExportBundle(
    title="Q3 Roadmap & <Pricing>",
    started_at=datetime(2026, 7, 24, 10, 0, tzinfo=UTC),
    duration_ms=3_725_000,
    participants=("Ann", "Bob"),
    sections=(Section.SUMMARY, Section.ACTION_ITEMS, Section.TRANSCRIPT),
    overview="We agreed the launch plan.",
    keywords=("launch",),
    outline=(OutlineLine(0, "Kickoff"),),
    action_items=(
        TaskLine("Send the deck", False, "Bob", 65_000),
        TaskLine("Book room", True, None, None),
    ),
    transcript=(SpokenLine("Ann", 1_000, "Let's begin"),),
)


def pdf_text(data: bytes) -> str:
    """Decode reportlab's ASCII85 + Flate page streams so assertions can see the drawn text."""
    out = []
    for match in re.finditer(rb"stream\r?\n(.*?)endstream", data, re.S):
        raw = match.group(1).strip()
        try:
            if raw.endswith(b"~>"):
                raw = base64.a85decode(raw[:-2], adobe=False)
            out.append(zlib.decompress(raw).decode("latin-1"))
        except (ValueError, zlib.error):
            continue
    return "\n".join(out)


@pytest.mark.parametrize("fmt", ["md", "txt"])
def test_text_formats_carry_title_overview_and_action_items(fmt: str) -> None:
    text = default_exporters().get(fmt).render(BUNDLE).decode()
    for expected in ("Q3 Roadmap & <Pricing>", "We agreed the launch plan.", "Send the deck",
                     "Bob, at 01:05", "Let's begin", "1:02:05", "Kickoff"):  # fmt: skip
        assert expected in text, (fmt, expected)
    assert ("- [x] Book room" if fmt == "md" else "[x] Book room") in text


def test_pdf_carries_title_overview_and_action_items() -> None:
    data = default_exporters().get("pdf").render(BUNDLE)
    assert data.startswith(b"%PDF")
    text = pdf_text(data)
    # reportlab splits a line into fragments at markup characters, hence the separate checks;
    # "&" and "<" arriving as text (not "&amp;") proves the escaping round-trips.
    for expected in (
        "(Q3 Roadmap & <)",
        "(Pricing)",
        "We agreed the launch plan.",
        "Send the deck",
    ):
        assert expected in text, expected


def test_sections_are_optional_and_ordered() -> None:
    assert parse_sections(None) == (Section.SUMMARY, Section.ACTION_ITEMS, Section.TRANSCRIPT)
    assert parse_sections("transcript, SUMMARY") == (Section.SUMMARY, Section.TRANSCRIPT)
    for bad in ("", " , ", "summary,video"):
        with pytest.raises(ValidationFailedError) as err:
            parse_sections(bad)
        assert err.value.code == "EXPORT_SECTION_UNKNOWN"
    only = ExportBundle(**{**BUNDLE.__dict__, "sections": (Section.ACTION_ITEMS,)})
    text = default_exporters().get("md").render(only).decode()
    assert "Send the deck" in text and "Let's begin" not in text and "Overview" not in text


def test_registry_is_open_for_new_formats() -> None:
    class Csv:
        media_type = "text/csv"
        extension = "csv"

        def render(self, bundle: ExportBundle) -> bytes:
            return bundle.title.encode()

    registry = ExporterRegistry()
    registry.register("csv", Csv())
    assert registry.get("CSV").render(BUNDLE) == BUNDLE.title.encode()
    with pytest.raises(ValidationFailedError) as err:
        registry.get("docx")
    assert err.value.code == "EXPORT_FORMAT_UNSUPPORTED"
    assert err.value.details["supported"] == ["csv"]


def test_filename_is_a_safe_slug() -> None:
    assert slugify("Café ../etc 🚀 Plan") == "cafe-etc-plan"
    assert slugify("🚀") == "meeting"
    name = export_filename("x" * 300, datetime(2026, 7, 24).date(), "pdf")
    assert len(name) <= 100 and name.endswith("-2026-07-24.pdf")


def _meeting(api: TestClient) -> int:
    body = {
        "title": "Launch / Review",
        "participants": ["Bob"],
        "segments": [{"speaker": "Ann", "start_ms": 0, "end_ms": 900, "text": "Plan the launch"}],
    }
    mid = int(api.post(f"{V1}/meetings", json=body).json()["id"])
    api.post(f"{V1}/meetings/{mid}/action-items", json={"text": "Draft the press release"})
    return mid


def test_export_api_formats_and_headers(api: TestClient) -> None:
    mid = _meeting(api)
    md = api.get(f"{V1}/meetings/{mid}/export", params={"format": "md"})
    assert md.status_code == 200
    assert md.headers["content-type"].startswith("text/markdown")
    assert re.fullmatch(
        r'attachment; filename="launch-review-\d{4}-\d{2}-\d{2}\.md"',
        md.headers["content-disposition"],
    )
    for expected in (
        "# Launch / Review",
        "Overview v1",
        "Draft the press release",
        "Plan the launch",
    ):
        assert expected in md.text
    txt = api.get(f"{V1}/meetings/{mid}/export?format=txt&sections=action_items")
    assert "Draft the press release" in txt.text and "Plan the launch" not in txt.text
    pdf = api.get(f"{V1}/meetings/{mid}/export?format=pdf")
    assert pdf.headers["content-type"] == "application/pdf" and pdf.content.startswith(b"%PDF")
    assert "Draft the press release" in pdf_text(pdf.content)


def test_export_api_errors(api: TestClient) -> None:
    mid = _meeting(api)
    bad = api.get(f"{V1}/meetings/{mid}/export?format=docx")
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "EXPORT_FORMAT_UNSUPPORTED"
    sect = api.get(f"{V1}/meetings/{mid}/export?sections=summary,video")
    assert sect.status_code == 422 and sect.json()["error"]["code"] == "EXPORT_SECTION_UNKNOWN"
    assert api.get(f"{V1}/meetings/999/export").status_code == 404
    api.delete(f"{V1}/meetings/{mid}")
    assert api.get(f"{V1}/meetings/{mid}/export").status_code == 410
