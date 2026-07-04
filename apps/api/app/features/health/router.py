"""
Health check router.

Provides a /health endpoint for infrastructure liveness/readiness probes.
Does not require authentication — must always be publicly accessible.
"""

import time

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.features.health.schemas import HealthResponse, ServiceStatus

router = APIRouter(tags=["health"])

settings = get_settings()

# Bump this when the API contract changes in a breaking way.
API_VERSION = "0.1.0"


async def _check_database() -> ServiceStatus:
    """Round-trip a trivial query against the database to verify connectivity."""
    start = time.perf_counter()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        return ServiceStatus(
            name="database",
            status="unhealthy",
            latency_ms=round((time.perf_counter() - start) * 1000, 3),
            detail=str(exc),
        )
    return ServiceStatus(
        name="database",
        status="healthy",
        latency_ms=round((time.perf_counter() - start) * 1000, 3),
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns the operational status of the API and its backing services.",
)
async def health_check() -> HealthResponse:
    """
    Liveness + readiness probe.

    Always returns HTTP 200 — the response body's ``status`` field reflects
    whether backing services are actually reachable, so callers can
    distinguish "process is up" from "process is fully ready".

    A Redis connectivity check is intentionally not included: no Redis client
    is wired into the application yet (see docs/adr/0003-event-driven-core.md,
    which documents the current direct-HTTP interim). Add a check here once
    that migration introduces a Redis client to probe.
    """
    services = [
        ServiceStatus(
            name="api",
            status="healthy",
            detail="Application process is running",
        ),
        await _check_database(),
    ]
    overall_status = "healthy" if all(s.status == "healthy" for s in services) else "degraded"

    return HealthResponse(
        status=overall_status,
        version=API_VERSION,
        environment=settings.environment,
        services=services,
    )
