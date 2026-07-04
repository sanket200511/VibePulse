"""
Health endpoint tests.

These are the canary tests for Sprint 0 — they verify the API boots
and the health endpoint returns the expected contract.

The endpoint always returns HTTP 200 (it is a liveness probe first); the
``status`` field reflects real backing-service reachability, so these tests
assert the *shape* of the response rather than a hardcoded "healthy" value —
whether the database service reports healthy depends on whether Postgres is
reachable in the environment the tests run in.
"""

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200() -> None:
    """The process is up, so /health responds 200 regardless of DB state."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_schema() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    data = response.json()
    assert data["status"] in ("healthy", "degraded", "unhealthy")
    assert "version" in data
    assert "environment" in data
    assert isinstance(data["services"], list)


@pytest.mark.asyncio
async def test_health_reports_api_service_healthy() -> None:
    """The API's own process status never depends on external services."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    services = {s["name"]: s for s in response.json()["services"]}
    assert services["api"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_reports_database_service() -> None:
    """A database ServiceStatus is always present, healthy or not."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    services = {s["name"]: s for s in response.json()["services"]}
    assert "database" in services
    assert services["database"]["status"] in ("healthy", "unhealthy")
    assert services["database"]["latency_ms"] is not None
