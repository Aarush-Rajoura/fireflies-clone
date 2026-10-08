from dataclasses import dataclass
from datetime import date
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BaseModel, Field, StringConstraints, field_validator

from app.models.enums import ActionItemSource, ActionItemStatus
from app.schemas.common import InputModel

ItemText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ActionItemCreate(InputModel):
    text: ItemText
    assignee_participant_id: int | None = None
    due_date: date | None = None
    start_ms: int | None = Field(default=None, ge=0)


class TaskCreate(InputModel):
    """A task from the Tasks page: standalone, or attached to a meeting by `meeting_id`."""

    text: ItemText
    due_date: date | None = None
    meeting_id: int | None = None
    assignee_participant_id: int | None = Field(
        default=None, description="Must be a participant of `meeting_id`."
    )
    assignee_user_id: int | None = None


class ActionItemUpdate(InputModel):
    """Partial edit; services use model_fields_set so null can clear assignee or due date."""

    text: ItemText | None = None
    assignee_participant_id: int | None = None
    assignee_user_id: int | None = None
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


class AssigneeUserRead(BaseModel):
    id: int
    name: str


class MeetingRef(BaseModel):
    id: int
    title: str


class ActionItemRead(BaseModel):
    id: int
    meeting_id: int | None
    meeting: MeetingRef | None
    text: str
    status: ActionItemStatus
    assignee: AssigneeRead | None
    assignee_user: AssigneeUserRead | None
    due_date: date | None
    completed_at: AwareDatetime | None
    source: ActionItemSource
    start_ms: int | None


TaskScope = Literal["mine", "all"]
TaskDue = Literal["overdue", "today", "week", "later", "none"]
TaskStatus = Literal["open", "completed"]


@dataclass(frozen=True)
class TaskFilters:
    scope: TaskScope = "all"
    status: TaskStatus | None = None
    due: TaskDue | None = None
    q: str | None = None
    tz: str = "UTC"
