"""
Health check response schemas.

These are the only public contracts for this feature.
Internal implementation details are never exposed.
"""

from typing import Literal

from pydantic import BaseModel, Field


class ServiceStatus(BaseModel):
    """Status of an individual backing service."""

    name: str
    status: Literal["healthy", "degraded", "unhealthy"]
    latency_ms: float | None = None
    detail: str | None = None


class HealthResponse(BaseModel):
    """Top-level health check response."""

    status: Literal["healthy", "degraded", "unhealthy"]
    version: str = Field(description="API version")
    environment: str
    services: list[ServiceStatus] = Field(default_factory=list)
