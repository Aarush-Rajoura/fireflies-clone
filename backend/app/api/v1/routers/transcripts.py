"""Transcript routes: parsing previews, reading and editing, and the recording."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse

from app.api.responses import GONE, NOT_FOUND, VALIDATION
from app.api.uploads import read_text_upload
from app.core.deps import (
    AppSettings,
    get_media_service,
    get_meeting_creation_service,
    get_transcript_service,
)
from app.schemas.transcript import (
    SegmentRead,
    SegmentUpdate,
    SpeakerRead,
    SpeakerRename,
    TranscriptPreview,
    TranscriptRead,
    TranscriptTextIn,
)
from app.services.media import MediaService
from app.services.meeting_creation import MeetingCreationService
from app.services.transcript import TranscriptService

router = APIRouter(tags=["transcripts"])

Transcripts = Annotated[TranscriptService, Depends(get_transcript_service)]
Creation = Annotated[MeetingCreationService, Depends(get_meeting_creation_service)]


@router.post(
    "/transcripts/parse",
    response_model=TranscriptPreview,
    summary="Preview a transcript file (multipart)",
    responses=VALIDATION,
)
def parse_transcript_file(
    file: Annotated[UploadFile, File(description="VTT, SRT, JSON or plain text.")],
    settings: AppSettings,
    service: Creation,
) -> TranscriptPreview:
    return service.preview(read_text_upload(file, settings.max_upload_mb), file.filename)


@router.post(
    "/transcripts/parse-text",
    response_model=TranscriptPreview,
    summary="Preview pasted transcript text (JSON)",
    responses=VALIDATION,
)
def parse_transcript_text(body: TranscriptTextIn, service: Creation) -> TranscriptPreview:
    return service.preview(body.text, body.filename)


@router.get(
    "/meetings/{meeting_id}/transcript",
    response_model=TranscriptRead,
    summary="Get a meeting's transcript",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def get_transcript(meeting_id: int, service: Transcripts) -> TranscriptRead:
    return service.get(meeting_id)


@router.patch(
    "/segments/{segment_id}",
    response_model=SegmentRead,
    summary="Edit a transcript segment",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def update_segment(segment_id: int, body: SegmentUpdate, service: Transcripts) -> SegmentRead:
    return service.update_segment(segment_id, body)


@router.patch(
    "/speakers/{speaker_id}",
    response_model=SpeakerRead,
    summary="Rename a speaker",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def rename_speaker(speaker_id: int, body: SpeakerRename, service: Transcripts) -> SpeakerRead:
    return service.rename_speaker(speaker_id, body.name)


@router.get(
    "/meetings/{meeting_id}/media",
    response_class=FileResponse,
    summary="Stream the recording (supports Range)",
    responses={
        200: {"content": {"audio/*": {}}, "description": "The recording bytes."},
        206: {"content": {"audio/*": {}}, "description": "A byte range of the recording."},
        **NOT_FOUND,
        **GONE,
        **VALIDATION,
    },
)
def get_media(
    meeting_id: int, service: Annotated[MediaService, Depends(get_media_service)]
) -> FileResponse:
    media = service.resolve(meeting_id)
    return FileResponse(media.path, media_type=media.media_type)
