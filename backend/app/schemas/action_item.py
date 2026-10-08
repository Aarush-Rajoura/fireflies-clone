from datetime import date
from typing import Annotated, Any

from pydantic import AwareDatetime, BaseModel, Field, StringConstraints, field_validator

from app.models.enums import ActionItemSource, ActionItemStatus
from app.schemas.common import InputModel

ItemText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ActionItemCreate(InputModel):
    text: ItemText
    assignee_participant_id: int | None = None
    due_date: date | None = None
    start_ms: int | None = Field(default=None, ge=0)


class ActionItemUpdate(InputModel):
    """Partial edit; services use model_fields_set so null can clear assignee or due date."""

    text: ItemText | None = None
    assignee_participant_id: int | None = None
    due_date: date | None = None
    status: ActionItemStatus | None = None

    @field_validator("text", "status", mode="before")
    @classmethod
    def _not_null(cls, value: Any) -> Any:
        # NOT NULL columns: an explicit null can only be a client mistake (omit the field).
        if value is None:
            raise ValueError("must not be null")
        return value


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
    completed_at: AwareDatetime | None
    source: ActionItemSource
    start_ms: int | None
