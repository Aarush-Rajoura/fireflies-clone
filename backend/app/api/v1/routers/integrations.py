"""The integration catalogue and the current user's (simulated) connections."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.api.params import Paging
from app.api.responses import NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_integration_service
from app.integrations import IntegrationCategory
from app.schemas.common import Page
from app.schemas.integration import IntegrationCategoryRead, IntegrationFilters, IntegrationRead
from app.services.integrations import IntegrationService

router = APIRouter(tags=["integrations"])

Integrations = Annotated[IntegrationService, Depends(get_integration_service)]


def integration_filters(
    category: IntegrationCategory | None = None,
    q: Annotated[
        str | None,
        Query(description="Case-insensitive substring of the name, vendor or description."),
    ] = None,
    connected: Annotated[
        bool | None, Query(description="Only connected (`true`) or unconnected (`false`).")
    ] = None,
) -> IntegrationFilters:
    return IntegrationFilters(category=category, q=q, connected=connected)


@router.get(
    "/integrations",
    response_model=Page[IntegrationRead],
    summary="List the integration catalogue with the current user's connection state",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def list_integrations(
    filters: Annotated[IntegrationFilters, Depends(integration_filters)],
    page: Paging,
    service: Integrations,
) -> Page[IntegrationRead]:
    return service.list(filters, page)


@router.get(
    "/integrations/categories",
    response_model=Page[IntegrationCategoryRead],
    summary="List integration categories with catalogue counts",
    responses=VALIDATION,
)
def list_integration_categories(
    page: Paging, service: Integrations
) -> Page[IntegrationCategoryRead]:
    return service.categories(page)


@router.put(
    "/integrations/{key}/connection",
    response_model=IntegrationRead,
    summary="Connect an integration (simulated; idempotent)",
    description="No data leaves the app: the connection is only recorded. "
    "An unknown key is `404 INTEGRATION_NOT_FOUND`.",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def connect_integration(key: str, service: Integrations) -> IntegrationRead:
    return service.connect(key)


@router.delete(
    "/integrations/{key}/connection",
    status_code=204,
    response_class=Response,
    summary="Disconnect an integration (idempotent)",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def disconnect_integration(key: str, service: Integrations) -> None:
    service.disconnect(key)
