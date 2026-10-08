"""The integration catalogue: static data shipped with the code, not stored in the database."""

from app.integrations.catalog import (
    CATALOG,
    CATEGORY_LABELS,
    CatalogEntry,
    IntegrationCategory,
    find,
)

__all__ = ["CATALOG", "CATEGORY_LABELS", "CatalogEntry", "IntegrationCategory", "find"]
