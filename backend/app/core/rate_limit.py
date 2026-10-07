"""Rate limiting for the routes that spend AI calls (and only those).

The limiter lives on `app.state` and the limit string comes from that app's own
settings, so two apps (or two tests) never share counters or configuration.
"""

import math
import time

from fastapi import Request
from limits import parse
from slowapi import Limiter
from starlette.exceptions import HTTPException

_SCOPE = "ai"


def client_ip(request: Request) -> str:
    # Behind a proxy every request shares its address; the first X-Forwarded-For hop is the
    # client. Only trustworthy when the proxy sets/overwrites the header (Vercel does).
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def build_limiter() -> Limiter:
    # In-memory storage is right for one process; several would need a shared store.
    return Limiter(key_func=client_ip, storage_uri="memory://")


def enforce_ai_rate_limit(request: Request) -> None:
    limiter: Limiter = request.app.state.limiter
    item = parse(request.app.state.settings.ai_rate_limit)
    key = client_ip(request)
    strategy = limiter.limiter
    if strategy.hit(item, _SCOPE, key):
        return
    reset_at = strategy.get_window_stats(item, _SCOPE, key).reset_time
    retry_after = max(1, math.ceil(reset_at - time.time()))
    # Raised as an HTTP error so the shared handler renders the envelope (code RATE_LIMITED).
    raise HTTPException(429, "AI rate limit exceeded", headers={"Retry-After": str(retry_after)})
