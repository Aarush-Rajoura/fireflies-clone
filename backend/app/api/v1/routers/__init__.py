"""Router assembly: the only place that knows which routers make up the API."""

from fastapi import APIRouter, FastAPI

from app.api.v1.routers import (
    action_items,
    channels,
    health,
    meetings,
    search,
    summaries,
    transcripts,
    users,
)

v1_router = APIRouter(prefix="/v1")
for module in (meetings, transcripts, summaries, action_items, search, channels, users):
    v1_router.include_router(module.router)


def mount_routers(app: FastAPI) -> None:
    app.include_router(health.router, prefix="/api")
    app.include_router(v1_router, prefix="/api")
