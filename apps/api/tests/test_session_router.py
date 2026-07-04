"""
Integration tests for the sessions REST endpoints.

Drives sessions into existence via POST /events (the only way a session is
created in production) rather than inserting rows directly, so these tests
exercise the real events -> Session Engine integration.
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient


def _event_payload(**overrides: object) -> dict:
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
async def test_ingest_event_creates_a_session(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload())

    response = await client.get("/sessions")

    assert response.status_code == 200
    sessions = response.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["status"] == "ACTIVE"
    assert sessions[0]["event_count"] == 1
    assert sessions[0]["primary_language"] == "python"


@pytest.mark.asyncio
async def test_second_event_extends_the_same_session(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    await client.post("/events", json=_event_payload(file_path="/repo/b.py"))

    response = await client.get("/sessions")

    sessions = response.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["event_count"] == 2
    assert sessions[0]["distinct_file_count"] == 2


@pytest.mark.asyncio
async def test_get_current_session_returns_the_active_session(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload())

    response = await client.get("/sessions/current")

    assert response.status_code == 200
    assert response.json()["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_get_current_session_returns_null_when_none_exist(client: AsyncClient) -> None:
    response = await client.get("/sessions/current")

    assert response.status_code == 200
    assert response.json() is None


@pytest.mark.asyncio
async def test_get_session_by_id(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload())
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    response = await client.get(f"/sessions/{session_id}")

    assert response.status_code == 200
    assert response.json()["id"] == session_id


@pytest.mark.asyncio
async def test_get_session_returns_404_for_unknown_id(client: AsyncClient) -> None:
    response = await client.get(f"/sessions/{uuid.uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_sessions_empty_when_no_events(client: AsyncClient) -> None:
    response = await client.get("/sessions")

    assert response.status_code == 200
    assert response.json()["sessions"] == []
