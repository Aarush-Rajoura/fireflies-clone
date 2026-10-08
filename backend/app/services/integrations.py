"""Integration catalogue use cases. Connections are simulated: connecting only records the fact."""

from datetime import datetime

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.integrations import CATALOG, CATEGORY_LABELS, CatalogEntry, find
from app.models import IntegrationConnection
from app.schemas.common import Page, PageParams
from app.schemas.integration import IntegrationCategoryRead, IntegrationFilters, IntegrationRead
from app.services.guards import require_current_user


def _read(entry: CatalogEntry, connected_at: datetime | None) -> IntegrationRead:
    return IntegrationRead(
        key=entry.key,
        name=entry.name,
        vendor=entry.vendor,
        category=entry.category,
        description=entry.description,
        featured=entry.featured,
        connected=connected_at is not None,
        connected_at=connected_at,
    )


def _matches(entry: CatalogEntry, needle: str) -> bool:
    return any(needle in text.lower() for text in (entry.name, entry.vendor, entry.description))


class IntegrationService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, filters: IntegrationFilters, page: PageParams) -> Page[IntegrationRead]:
        connected = self._connected_at()
        needle = (filters.q or "").strip().lower()
        entries = [
            e
            for e in CATALOG
            if (filters.category is None or e.category == filters.category)
            and (not needle or _matches(e, needle))
            and (filters.connected is None or (e.key in connected) == filters.connected)
        ]
        window = entries[page.offset : page.offset + page.page_size]
        return Page(
            items=[_read(e, connected.get(e.key)) for e in window],
            page=page.page,
            page_size=page.page_size,
            total=len(entries),
        )

    def categories(self, page: PageParams) -> Page[IntegrationCategoryRead]:
        rows = [
            IntegrationCategoryRead(
                key=category,
                label=label,
                count=sum(1 for e in CATALOG if e.category == category),
            )
            for category, label in CATEGORY_LABELS.items()
        ]
        return Page(
            items=rows[page.offset : page.offset + page.page_size],
            page=page.page,
            page_size=page.page_size,
            total=len(rows),
        )

    def connect(self, key: str) -> IntegrationRead:
        """Idempotent: connecting twice keeps the original `connected_at`."""
        entry = self._entry(key)
        user = require_current_user(self.uow)
        existing = self.uow.integration_connections.find(user.id, key)
        if existing is not None:
            return _read(entry, existing.connected_at)
        try:
            row = self.uow.integration_connections.add(
                IntegrationConnection(user_id=user.id, integration_key=key)
            )
            self.uow.commit()
        except IntegrityError:
            # A concurrent connect won the unique (user, key) race; theirs is the connection.
            self.uow.rollback()
            winner = self.uow.integration_connections.find(user.id, key)
            if winner is None:
                raise
            return _read(entry, winner.connected_at)
        return _read(entry, row.connected_at)

    def disconnect(self, key: str) -> None:
        """Idempotent: disconnecting something not connected is not an error."""
        self._entry(key)
        user = require_current_user(self.uow)
        existing = self.uow.integration_connections.find(user.id, key)
        if existing is not None:
            self.uow.integration_connections.delete(existing)
            self.uow.commit()

    def _entry(self, key: str) -> CatalogEntry:
        entry = find(key)
        if entry is None:
            raise NotFoundError("Integration not found", code="INTEGRATION_NOT_FOUND")
        return entry

    def _connected_at(self) -> dict[str, datetime]:
        user = require_current_user(self.uow)
        return self.uow.integration_connections.connected_at_by_key(user.id)
