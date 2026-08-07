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

    # ── Daemon ───────────────────────────────────────────────────────────────
    daemon_url: str = "http://localhost:9000"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://vibepulse:vibepulse_dev@localhost:5432/vibepulse"

    # ── Redis ─────────────────────────────────────────────────────────────────
    # Redis will use a managed Redis Cloud instance.
    # Provide REDIS_URL via environment variables.
    redis_url: str = "redis://localhost:6379/0"

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: list[AnyHttpUrl] = [AnyHttpUrl("http://localhost:5173")]

    # ── Session Engine ───────────────────────────────────────────────────────
    # A session moves ACTIVE -> IDLE after this many seconds without an event.
    session_idle_timeout_seconds: int = Field(default=300, ge=1)
    # An IDLE session moves IDLE -> COMPLETED after this many *additional*
    # seconds without an event (i.e. total silence >= idle + completion).
    session_completion_timeout_seconds: int = Field(default=900, ge=1)
    # How often the in-process sweep loop checks for expired sessions.
    session_sweep_interval_seconds: int = Field(default=30, ge=1)

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
