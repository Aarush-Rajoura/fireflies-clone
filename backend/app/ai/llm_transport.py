"""HTTP transport for Gemini `generateContent` with a strict latency budget.

Every request shares ONE deadline (`budget_s`) across its attempts, so a
retry can never double the time a user waits:

- a timeout is not retried: a second attempt would only blow the budget;
- 5xx and connection errors get one retry, if the budget still has room;
- 429 is retried only when `Retry-After` asks for <= 5s (honoured exactly);
  a longer or missing hint means the quota is gone, so fail fast to fallback;
- any other 4xx is our request or our key, and no retry fixes it.

The API key travels in the `x-goog-api-key` header, never the URL, so it
cannot leak into logs or error messages.
"""

import time
from collections.abc import Callable
from typing import Any

import httpx

from app.ai.interfaces import ProviderError

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
TIMEOUT_S = 20.0
REQUEST_BUDGET_S = 25.0
MAX_RETRIES = 1
MAX_RETRY_AFTER_S = 5.0
# Below this much remaining budget an attempt cannot realistically succeed.
_MIN_ATTEMPT_S = 1.0
_RETRYABLE_STATUS = frozenset({500, 502, 503, 504})


def _retry_after(response: httpx.Response) -> float | None:
    """Seconds from a numeric Retry-After header; HTTP-dates are treated as absent."""
    try:
        return max(0.0, float(response.headers.get("retry-after", "")))
    except ValueError:
        return None


class GeminiTransport:
    def __init__(
        self,
        api_key: str,
        client: httpx.Client | None = None,
        *,
        timeout_s: float = TIMEOUT_S,
        budget_s: float = REQUEST_BUDGET_S,
        retry_backoff_s: float = 0.5,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._api_key = api_key
        # Process-lifetime singleton (the provider is built once per process):
        # it holds the connection pool, so it is deliberately never closed.
        self._client = client or httpx.Client()
        self._timeout = timeout_s
        self._budget = budget_s
        self._backoff = retry_backoff_s
        self._clock = clock
        self._sleep = sleep

    def __repr__(self) -> str:  # never show the key
        return "GeminiTransport()"

    def post(self, model: str, body: dict[str, Any]) -> httpx.Response:
        url = f"{GEMINI_BASE_URL}/models/{model}:generateContent"
        headers = {"x-goog-api-key": self._api_key}
        deadline = self._clock() + self._budget
        failure = "latency budget exhausted"
        for attempt in range(MAX_RETRIES + 1):
            remaining = deadline - self._clock()
            if remaining < _MIN_ATTEMPT_S:
                break
            wait = self._backoff
            try:
                response = self._client.post(
                    url, json=body, headers=headers, timeout=min(self._timeout, remaining)
                )
            except httpx.TimeoutException:
                raise ProviderError("Gemini request timed out") from None
            except httpx.TransportError as error:
                failure = f"transport error ({type(error).__name__})"
            else:
                if response.status_code == 429:
                    hint = _retry_after(response)
                    if hint is None or hint > MAX_RETRY_AFTER_S:
                        raise ProviderError("Gemini rate limited (HTTP 429)")
                    failure, wait = "HTTP 429", hint
                elif response.status_code in _RETRYABLE_STATUS:
                    failure = f"HTTP {response.status_code}"
                elif response.is_error:
                    raise ProviderError(f"Gemini returned HTTP {response.status_code}")
                else:
                    return response
            if attempt == MAX_RETRIES or self._clock() + wait + _MIN_ATTEMPT_S > deadline:
                break
            self._sleep(wait)
        raise ProviderError(f"Gemini request failed: {failure}")
