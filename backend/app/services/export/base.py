from typing import Protocol

from app.services.export.bundle import ExportBundle


class Exporter(Protocol):
    """One download format. Adding a format means adding one of these to the registry."""

    media_type: str
    extension: str

    def render(self, bundle: ExportBundle) -> bytes: ...
