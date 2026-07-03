"""
Health check router.

Provides a /health endpoint for infrastructure liveness/readiness probes.
Does not require authentication — must always be publicly accessible.
"""

from fastapi import APIRouter

from app.core.config import get_settings
from app.features.health.schemas import HealthResponse, ServiceStatus

router = APIRouter(tags=["health"])

settings = get_settings()

# Bump this when the API contract changes in a breaking way.
API_VERSION = "0.1.0"


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns the operational status of the API and its backing services.",
)
async def health_check() -> HealthResponse:
    """
    Liveness + shallow readiness probe.

    Returns HTTP 200 when the application process is running.
    Deep service connectivity checks (DB, Redis) will be added
    once those services are wired into the app lifecycle.
    """
    return HealthResponse(
        status="healthy",
        version=API_VERSION,
        environment=settings.environment,
        services=[
            ServiceStatus(
                name="api",
                status="healthy",
                detail="Application process is running",
            ),
            # TODO(sprint-1): Add database connectivity check
            # TODO(sprint-1): Add Redis connectivity check
        ],
    )
