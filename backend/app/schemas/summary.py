from datetime import datetime

from pydantic import BaseModel


class OutlineEntryRead(BaseModel):
    title: str
    start_ms: int | None


class NoteGroupRead(BaseModel):
    title: str
    bullets: list[str]


class SummaryRead(BaseModel):
    overview: str
    keywords: list[str]
    outline: list[OutlineEntryRead]
    notes: list[NoteGroupRead]
    provider: str | None
    model: str | None
    generated_at: datetime | None
    is_stale: bool
