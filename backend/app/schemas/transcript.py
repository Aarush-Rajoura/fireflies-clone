from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.schemas.common import InputModel

Speaker = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
LineText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class SegmentIn(InputModel):
    speaker: Speaker
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    text: LineText

    @model_validator(mode="after")
    def _ordered(self) -> "SegmentIn":
        if self.end_ms < self.start_ms:
            raise ValueError("end_ms must not be before start_ms")
        return self


class SegmentUpdate(InputModel):
    text: LineText


class SpeakerRename(InputModel):
    name: Speaker


class SegmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sequence: int
    start_ms: int
    end_ms: int
    speaker_id: int
    text: str
    original_text: str
    is_edited: bool


class SpeakerRead(BaseModel):
    id: int
    # The raw diarisation label; `name` is what the UI shows once a participant is linked.
    label: str
    name: str
    color_index: int
    participant_id: int | None


class TranscriptRead(BaseModel):
    speakers: list[SpeakerRead]
    segments: list[SegmentRead]


class TranscriptPreview(BaseModel):
    format: str
    timings_estimated: bool
    speakers: list[str]
    segment_count: int
    duration_ms: int
    warnings: list[str]
    segments: list[SegmentIn]


class TranscriptTextIn(InputModel):
    """Pasted transcript text, the JSON counterpart of a file upload."""

    text: str
    filename: str | None = Field(default=None, max_length=255)
