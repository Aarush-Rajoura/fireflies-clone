from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models.enums import ActionItemSource, ActionItemStatus

ItemText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ActionItemCreate(BaseModel):
    text: ItemText
    assignee_participant_id: int | None = None
    due_date: date | None = None
    start_ms: int | None = None


class ActionItemUpdate(BaseModel):
    """Partial edit; services use model_fields_set so null can clear assignee or due date."""

    text: ItemText | None = None
    assignee_participant_id: int | None = None
    due_date: date | None = None
    status: ActionItemStatus | None = None


class AssigneeRead(BaseModel):
    id: int
    display_name: str


class ActionItemRead(BaseModel):
    id: int
    meeting_id: int
    text: str
    status: ActionItemStatus
    assignee: AssigneeRead | None
    due_date: date | None
    completed_at: datetime | None
    source: ActionItemSource
    start_ms: int | None
