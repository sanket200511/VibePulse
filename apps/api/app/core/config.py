"""
Application configuration.

All settings are sourced from environment variables (12-factor app).
Pydantic-settings provides validation and type coercion.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "info"
    api_port: int = Field(default=8000, ge=1, le=65535)

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://vibepulse:vibepulse_dev@localhost:5432/vibepulse"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: list[AnyHttpUrl] = ["http://localhost:5173"]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Uses lru_cache so we read the environment once per process lifetime.
    """
    return Settings()
