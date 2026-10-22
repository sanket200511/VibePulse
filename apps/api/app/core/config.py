"""
Application configuration.

All settings are sourced from environment variables (12-factor app).
Pydantic-settings provides validation and type coercion.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, field_validator
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
    api_port: int = Field(
        default=5184,
        ge=1,
        le=65535,
        validation_alias=AliasChoices("PORT", "VIBEPULSE_API_PORT", "API_PORT"),
    )

    # ── Daemon ───────────────────────────────────────────────────────────────
    daemon_url: str = Field(
        default="http://localhost:5185",
        validation_alias=AliasChoices("VIBEPULSE_DAEMON_URL", "DAEMON_URL"),
    )

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://vibepulse:vibepulse_dev@localhost:5432/vibepulse"

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_database_url(cls, v: object) -> object:
        if isinstance(v, str):
            # Render PostgreSQL connection strings use postgres:// or postgresql://
            # SQLAlchemy asyncpg requires postgresql+asyncpg://
            if v.startswith("postgres://"):
                v = "postgresql+asyncpg://" + v[len("postgres://") :]
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = "postgresql+asyncpg://" + v[len("postgresql://") :]
            # asyncpg does not accept sslmode parameter; replace with ssl
            if "sslmode=" in v:
                v = v.replace("sslmode=", "ssl=")
        return v

    # ── Redis ─────────────────────────────────────────────────────────────────
    # Redis will use a managed Redis Cloud instance.
    # Provide REDIS_URL via environment variables.
    redis_url: str = "redis://localhost:6379/0"

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:5183",
        "http://127.0.0.1:5183",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped == "*":
                return ["*"]
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                import contextlib
                import json

                with contextlib.suppress(Exception):
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item) for item in parsed]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return [str(item) for item in v]
        return v

    # ── Session Engine ───────────────────────────────────────────────────────
    # A session moves ACTIVE -> IDLE after this many seconds without an event.
    session_idle_timeout_seconds: int = Field(default=300, ge=1)
    # An IDLE session moves IDLE -> COMPLETED after this many *additional*
    # seconds without an event (i.e. total silence >= idle + completion).
    session_completion_timeout_seconds: int = Field(default=900, ge=1)
    # How often the in-process sweep loop checks for expired sessions.
    session_sweep_interval_seconds: int = Field(default=30, ge=1)

    # ── Authentication & Security ─────────────────────────────────────────────
    jwt_secret_key: str = Field(
        default="vibepulse-production-secure-jwt-signing-key-32-bytes-minimum",
        validation_alias=AliasChoices("JWT_SECRET_KEY", "JWT_SECRET", "SECRET_KEY"),
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = Field(default=60 * 24 * 7, ge=1)

    # ── Google Cloud OAuth ───────────────────────────────────────────────────
    google_client_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GOOGLE_CLIENT_ID", "GCP_CLIENT_ID"),
    )

    # ── Email Verification & SMTP ─────────────────────────────────────────────
    email_verification_code_expire_minutes: int = Field(default=15, ge=1)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "noreply@vibepulse.dev"

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
