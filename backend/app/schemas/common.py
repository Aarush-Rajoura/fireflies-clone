"""Schemas shared by every endpoint: pagination and the error envelope."""

import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20


class InputModel(BaseModel):
    """Base for request bodies: typos are errors, not silently ignored fields."""

    model_config = ConfigDict(extra="forbid")


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1)

    @field_validator("page_size")
    @classmethod
    def _clamp(cls, value: int) -> int:
        # Clamp rather than reject so clients asking for "everything" still succeed.
        return min(value, MAX_PAGE_SIZE)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Page[T](BaseModel):
    items: list[T]
    page: int
    page_size: int
    total: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_pages(self) -> int:
        return math.ceil(self.total / self.page_size) if self.page_size else 0

    @computed_field  # type: ignore[prop-decorator]
    @property
    def has_next(self) -> bool:
        return self.page < self.total_pages


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail
