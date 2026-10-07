"""Application settings: the only module that reads environment variables."""

from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Anchored to the package so `backend/.env` is found regardless of the cwd.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    database_url: str = "sqlite:///./fireflies.db"
    # NoDecode: accept "a,b" from the environment instead of requiring a JSON list.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    ai_provider: Literal["mock", "gemini"] = "mock"
    ai_api_key: str = ""
    ai_model: str = ""
    ai_rate_limit: str = "10/minute"
    media_dir: Path = Path("./media")
    max_upload_mb: int = 10
    seed_anchor_date: datetime | None = None
    app_version: str = "0.1.0"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    @field_validator("seed_anchor_date", mode="before")
    @classmethod
    def _blank_anchor_is_none(cls, value: object) -> object:
        return None if value == "" else value


@lru_cache
def get_settings() -> Settings:
    return Settings()
