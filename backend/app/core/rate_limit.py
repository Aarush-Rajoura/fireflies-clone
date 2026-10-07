"""Rate limiting for the routes that spend AI calls (and only those)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

# In-memory storage is right for one process; several would need a shared store.
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")


def ai_rate_limit() -> str:
    # A callable so the limit follows Settings instead of being frozen at import time.
    return get_settings().ai_rate_limit
