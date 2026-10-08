"""Application factory: wires settings, database, middleware, handlers and routers."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import mount_routers
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestContextMiddleware
from app.core.rate_limit import build_limiter
from app.db.session import make_engine, make_session_factory


def configure_logging(level: str) -> None:
    """Root handler for the app's loggers (access log, errors, AI fallbacks).

    basicConfig is a no-op when a handler already exists (pytest, a host's own
    config), so this never duplicates output; the level is applied regardless.
    """
    logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("app").setLevel(level.upper())


def create_app(settings: Settings | None = None) -> FastAPI:
    # Settings are injectable so tests build an app against their own database.
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title="Fireflies Clone API",
        version=settings.app_version,
        # Handler names become operationIds, so generated clients get `list_meetings`, not paths.
        generate_unique_id_function=lambda route: route.name,
    )
    app.state.settings = settings
    app.state.engine = make_engine(settings.database_url, settings.sqlite_journal_mode)
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
    app.state.limiter = build_limiter()
    mount_routers(app)
    return app


app = create_app()
