"""Format name -> exporter. New formats are registered, never switched on."""

from app.core.exceptions import ValidationFailedError
from app.services.export.base import Exporter
from app.services.export.markdown import MarkdownExporter
from app.services.export.pdf import PdfExporter
from app.services.export.text import TextExporter


class ExporterRegistry:
    def __init__(self) -> None:
        self._by_format: dict[str, Exporter] = {}

    def register(self, name: str, exporter: Exporter) -> None:
        self._by_format[name.lower()] = exporter

    def formats(self) -> list[str]:
        return list(self._by_format)

    def get(self, name: str) -> Exporter:
        exporter = self._by_format.get(name.lower())
        if exporter is None:
            raise ValidationFailedError(
                "Unsupported export format",
                code="EXPORT_FORMAT_UNSUPPORTED",
                details={"format": name, "supported": self.formats()},
            )
        return exporter


def default_exporters() -> ExporterRegistry:
    registry = ExporterRegistry()
    registry.register("md", MarkdownExporter())
    registry.register("txt", TextExporter())
    registry.register("pdf", PdfExporter())
    return registry


DEFAULT_FORMATS = tuple(default_exporters().formats())
