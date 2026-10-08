from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel

from app.integrations import IntegrationCategory


class IntegrationRead(BaseModel):
    key: str
    name: str
    vendor: str
    category: IntegrationCategory
    description: str
    featured: bool
    connected: bool
    # Null while not connected.
    connected_at: datetime | None


class IntegrationCategoryRead(BaseModel):
    key: IntegrationCategory
    label: str
    # Catalogue entries in the category, regardless of connection state.
    count: int


@dataclass(frozen=True, slots=True)
class IntegrationFilters:
    category: IntegrationCategory | None = None
    q: str | None = None
    connected: bool | None = None
