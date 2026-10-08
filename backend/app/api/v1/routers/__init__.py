"""Router assembly: the only place that knows which routers make up the API."""

from fastapi import APIRouter, FastAPI

from app.api.v1.routers import (
    action_items,
    ask,
    channels,
    comments,
    exports,
    health,
    highlights,
    home,
    meetings,
    search,
    soundbites,
    summaries,
    tags,
    transcripts,
    users,
)

ROUTERS = (
    meetings,
    transcripts,
    summaries,
    action_items,
    comments,
    highlights,
    soundbites,
    exports,
    ask,
    search,
    channels,
    tags,
    users,
    home,
)

v1_router = APIRouter(prefix="/v1")
for module in ROUTERS:
    v1_router.include_router(module.router)


def mount_routers(app: FastAPI) -> None:
    app.include_router(health.router, prefix="/api")
    app.include_router(v1_router, prefix="/api")
