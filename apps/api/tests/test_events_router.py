"""
Integration tests for the events REST endpoints.

Exercises the real router + service + Postgres round-trip (see
tests/conftest.py) rather than mocking the service layer, since the
dedupe behaviour depends on the actual unique constraint firing.
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient


def _payload(**overrides: object) -> dict:
    base = {
        "event_type": "FILE_MODIFIED",
        "timestamp": datetime.now(UTC).isoformat(),
        "session_id": str(uuid.uuid4()),
        "project_root": "/home/dev/vibepulse",
        "file_path": "/home/dev/vibepulse/apps/api/app/main.py",
        "file_name": "main.py",
        "file_extension": ".py",
        "language": "python",
        "git_branch": "main",
        "metadata": {},
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_ingest_event_returns_201(client: AsyncClient) -> None:
    response = await client.post("/events", json=_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["event_type"] == "FILE_MODIFIED"
    assert body["schema_version"] == 1
    assert "id" in body


@pytest.mark.asyncio
async def test_ingest_duplicate_event_returns_200_with_same_id(client: AsyncClient) -> None:
    payload = _payload()

    first = await client.post("/events", json=payload)
    second = await client.post("/events", json=payload)

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


@pytest.mark.asyncio
async def test_ingest_event_rejects_invalid_event_type(client: AsyncClient) -> None:
    response = await client.post("/events", json=_payload(event_type="NOT_REAL"))

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ingest_event_rejects_missing_required_field(client: AsyncClient) -> None:
    payload = _payload()
    del payload["file_path"]

    response = await client.post("/events", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_events_returns_newest_first(client: AsyncClient) -> None:
    older = _payload(
        file_path="/repo/a.py",
        timestamp=datetime(2026, 1, 1, tzinfo=UTC).isoformat(),
    )
    newer = _payload(
        file_path="/repo/b.py",
        timestamp=datetime(2026, 1, 2, tzinfo=UTC).isoformat(),
    )

    await client.post("/events", json=older)
    await client.post("/events", json=newer)

    response = await client.get("/events")

    assert response.status_code == 200
    events = response.json()["events"]
    assert len(events) == 2
    assert events[0]["file_path"] == "/repo/b.py"
    assert events[1]["file_path"] == "/repo/a.py"


@pytest.mark.asyncio
async def test_list_events_empty_when_no_events(client: AsyncClient) -> None:
    response = await client.get("/events")

    assert response.status_code == 200
    assert response.json()["events"] == []


@pytest.mark.asyncio
async def test_start_observation(client: AsyncClient) -> None:
    session_id = str(uuid.uuid4())
    payload = {"session_id": session_id, "timestamp": datetime.now(UTC).isoformat()}

    response = await client.post("/projects/my_project_root/observation/start", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["event_type"] == "OBSERVATION_STARTED"
    assert body["project_root"] == "my_project_root"
    assert body["file_path"] is None
    assert body["file_name"] is None
    assert "server_received_at" in body


@pytest.mark.asyncio
async def test_stop_observation(client: AsyncClient) -> None:
    session_id = str(uuid.uuid4())
    payload = {"session_id": session_id, "timestamp": datetime.now(UTC).isoformat()}

    response = await client.post("/projects/my_project_root/observation/stop", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["event_type"] == "OBSERVATION_STOPPED"
    assert body["project_root"] == "my_project_root"
    assert body["file_path"] is None
    assert body["file_name"] is None
