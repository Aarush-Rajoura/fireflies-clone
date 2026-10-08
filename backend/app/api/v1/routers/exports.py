"""Meeting export as a downloadable file."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.api.responses import GONE, NOT_FOUND, VALIDATION, Responses
from app.core.deps import get_export_service
from app.services.export import ALL_SECTIONS, DEFAULT_FORMATS, ExportService

router = APIRouter(tags=["exports"])

_FILE: Responses = {
    200: {
        "description": "The file, with `Content-Disposition: attachment; filename=...`.",
        "content": {
            "text/markdown": {"schema": {"type": "string"}},
            "text/plain": {"schema": {"type": "string"}},
            "application/pdf": {"schema": {"type": "string", "format": "binary"}},
        },
    }
}


@router.get(
    "/meetings/{meeting_id}/export",
    response_class=Response,
    summary="Export a meeting as a file",
    description="Unknown `format` is `422 EXPORT_FORMAT_UNSUPPORTED`; an unknown or empty "
    "`sections` list is `422 EXPORT_SECTION_UNKNOWN`.",
    responses={**_FILE, **NOT_FOUND, **GONE, **VALIDATION},
)
def export_meeting(
    meeting_id: int,
    service: Annotated[ExportService, Depends(get_export_service)],
    # Typed `str` so the registry stays open; the enum is only advertised for client types.
    format: Annotated[
        str,
        Query(
            description=f"One of: {', '.join(DEFAULT_FORMATS)}.",
            json_schema_extra={"enum": list(DEFAULT_FORMATS)},
        ),
    ] = "md",
    sections: Annotated[
        str | None,
        Query(
            description="Comma-separated, any of: "
            f"{', '.join(s.value for s in ALL_SECTIONS)}. Omit for all."
        ),
    ] = None,
) -> Response:
    file = service.export(meeting_id, format, sections)
    return Response(
        content=file.content,
        media_type=file.media_type,
        # The filename is a whitelist slug, so it needs no quoting beyond the quotes.
        headers={"Content-Disposition": f'attachment; filename="{file.filename}"'},
    )
