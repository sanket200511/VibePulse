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


async def _check_redis() -> ServiceStatus:
    """Verify Redis or Upstash connectivity and report client type."""
    start = time.perf_counter()
    try:
        from app.core.redis import get_redis_client

        client = get_redis_client()
        await client.ping()  # type: ignore[union-attr]
        latency = round((time.perf_counter() - start) * 1000, 3)
        client_type = getattr(client, "client_type", "tcp")
        is_fallback = getattr(client, "is_fallback", False)
        return ServiceStatus(
            name="redis",
            status="healthy",
            latency_ms=latency,
            detail="In-memory fallback" if is_fallback else f"Connected ({client_type})",
        )
    except Exception as exc:
        return ServiceStatus(
            name="redis",
            status="degraded",
            latency_ms=round((time.perf_counter() - start) * 1000, 3),
            detail=str(exc),
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns the operational status of the API and its backing services.",
)
@router.get(
    "/api/health",
    response_model=HealthResponse,
    include_in_schema=False,
)
async def health_check() -> HealthResponse:
    """
    Liveness + readiness probe.

    Always returns HTTP 200 — the response body's ``status`` field reflects
    whether backing services are actually reachable.
    """
    services = [
        ServiceStatus(
            name="api",
            status="healthy",
            detail="Application process is running",
        ),
        ServiceStatus(
            name="keep_alive",
            status="healthy",
            detail=(
                f"Active (self-pinging every {settings.keep_alive_interval_minutes}m to keep awake)"
                if settings.render_keep_alive
                else "Inactive (dormancy enabled to conserve Render free-tier monthly hours)"
            ),
        ),
        await _check_database(),
        await _check_redis(),
    ]
    overall_status = "healthy" if all(s.status == "healthy" for s in services) else "degraded"

    return HealthResponse(
        status=overall_status,
        version=API_VERSION,
        environment=settings.environment,
        services=services,
    )
