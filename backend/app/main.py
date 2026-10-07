"""Application factory: wires settings, database, middleware, handlers and routers."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import health
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestContextMiddleware
from app.db.session import make_engine, make_session_factory


def create_app(settings: Settings | None = None) -> FastAPI:
    # Settings are injectable so tests build an app against their own database.
    settings = settings or get_settings()
    app = FastAPI(title="Fireflies Clone API", version=settings.app_version)
    app.state.settings = settings
    app.state.engine = make_engine(settings.database_url)
    app.state.session_factory = make_session_factory(app.state.engine)

    # Added last = outermost, so CORS headers also land on error responses.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    register_exception_handlers(app)
    app.include_router(health.router, prefix="/api")
    return app


app = create_app()
