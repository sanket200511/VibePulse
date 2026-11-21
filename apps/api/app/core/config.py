"""
Application configuration.

All settings are sourced from environment variables (12-factor app).
Pydantic-settings provides validation and type coercion.
"""

import re
from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ALLOWED_ORIGIN_REGEX = re.compile(
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.onrender\.com$"
)


def is_origin_allowed(origin: str | None, cors_origins: list[str]) -> bool:
    """Validate whether an HTTP or WebSocket origin is permitted."""
    if not origin:
        return True
    origin_clean = origin.rstrip("/")
    if "*" in cors_origins:
        return True
    allowed = [str(o).rstrip("/") for o in cors_origins]
    if origin_clean in allowed:
        return True
    return bool(ALLOWED_ORIGIN_REGEX.match(origin_clean))


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
            # SQLAlchemy asyncpg requires the explicit driver scheme.
            if v.startswith("postgres://"):
                v = "postgresql+asyncpg://" + v[len("postgres://") :]
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = "postgresql+asyncpg://" + v[len("postgresql://") :]
            # asyncpg uses `ssl` instead of libpq's `sslmode` and does not
            # support libpq's `channel_binding` connection option.
            parsed = urlsplit(v)
            query = parse_qsl(parsed.query, keep_blank_values=True)
            has_ssl = any(key == "ssl" for key, _ in query)
            normalized_query = []
            for key, value in query:
                if key == "channel_binding":
                    continue
                if key == "sslmode":
                    if not has_ssl:
                        normalized_query.append(("ssl", value))
                    continue
                normalized_query.append((key, value))
            v = urlunsplit(parsed._replace(query=urlencode(normalized_query)))
        return v

    # ── Redis / Upstash ───────────────────────────────────────────────────────
    # Supports both TCP (rediss://...) and Upstash REST (https://...).
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "UPSTASH_REDIS_URL"),
    )
    upstash_redis_rest_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("UPSTASH_REDIS_REST_URL", "REDIS_REST_URL"),
    )
    upstash_redis_rest_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("UPSTASH_REDIS_REST_TOKEN", "REDIS_REST_TOKEN"),
    )

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

    # ── Render Free-Tier Keep-Alive ───────────────────────────────────────────
    render_keep_alive: bool = Field(
        default=False,
        validation_alias=AliasChoices("RENDER_KEEP_ALIVE", "KEEP_ALIVE_ENABLED"),
    )
    keep_alive_interval_minutes: int = Field(
        default=12,
        ge=1,
        le=60,
        validation_alias=AliasChoices("KEEP_ALIVE_INTERVAL_MINUTES", "RENDER_KEEP_ALIVE_INTERVAL"),
    )
    keep_alive_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RENDER_EXTERNAL_URL", "KEEP_ALIVE_URL", "SELF_PING_URL"),
    )

    def get_keep_alive_url(self) -> str:
        """Returns the fully qualified URL to ping."""
        if self.keep_alive_url:
            url = self.keep_alive_url.rstrip("/")
            if not url.endswith("/health"):
                url = f"{url}/health"
            return url
        if self.environment == "production":
            return "https://vibepulse-api.onrender.com/health"
        return f"http://127.0.0.1:{self.api_port}/health"

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
