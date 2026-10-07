from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Speaker = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
LineText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class SegmentIn(BaseModel):
    speaker: Speaker
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    text: LineText


class SegmentUpdate(BaseModel):
    text: LineText


class SpeakerRename(BaseModel):
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
