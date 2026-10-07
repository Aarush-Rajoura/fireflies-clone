"""Provider assembly and the capability dependencies services receive.

With `AI_PROVIDER=gemini` and a key, the pipeline reads inside-out:
Gemini first, the mock on any `ProviderError` (labelled
"mock (llm fallback)"), and a cache in front so identical input never re-bills.
Without a key it stays fully offline on the mock - the app must never
hard-fail for want of an API key.

Each `get_*` dependency returns the same process-wide provider (built once:
the Gemini client owns a connection pool and the cache must outlive requests),
typed as only the capability the caller needs.
"""

from functools import cache

from app.ai.cache import CachingProvider
from app.ai.fallback import FallbackProvider
from app.ai.interfaces import ActionItemExtractor, AIProvider, QuestionAnswerer, Summarizer
from app.ai.llm import DEFAULT_GEMINI_MODEL, GeminiProvider
from app.ai.mock import MockProvider
from app.core.config import Settings, get_settings


def build_ai_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == "gemini" and settings.ai_api_key:
        gemini = GeminiProvider(settings.ai_api_key, settings.ai_model or DEFAULT_GEMINI_MODEL)
        return CachingProvider(FallbackProvider(gemini, MockProvider()))
    return MockProvider()


@cache
def get_ai_provider() -> AIProvider:
    return build_ai_provider(get_settings())


def get_summarizer() -> Summarizer:
    return get_ai_provider()


def get_action_item_extractor() -> ActionItemExtractor:
    return get_ai_provider()


def get_question_answerer() -> QuestionAnswerer:
    return get_ai_provider()
