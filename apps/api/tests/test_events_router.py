"""
Integration tests for the events REST endpoints.

Exercises the real router + service + Postgres round-trip (see
tests/conftest.py) rather than mocking the service layer, since the
dedupe behaviour depends on the actual unique constraint firing.
"""

import asyncio
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, RequestError, TimeoutException
from httpx import Response as HttpxResponse


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
    assert body["schema_version"] == 2
    assert "id" in body

    # Wait for the background analysis task to complete before teardown deletes rows
    await asyncio.sleep(0.1)


@pytest.mark.asyncio
async def test_ingest_duplicate_event_returns_200_with_same_id(client: AsyncClient) -> None:
    payload = _payload()

    first = await client.post("/events", json=payload)
    second = await client.post("/events", json=payload)

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]

    await asyncio.sleep(0.1)


@pytest.mark.asyncio
async def test_ingest_event_rejects_invalid_event_type(client: AsyncClient) -> None:
    response = await client.post("/events", json=_payload(event_type="NOT_REAL"))

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ingest_event_rejects_missing_required_field(client: AsyncClient) -> None:
    payload = _payload()
    del payload["event_type"]

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
@patch("app.features.events.router.httpx.AsyncClient")
async def test_start_observation_success(mock_client_class: AsyncMock, client: AsyncClient) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    mock_instance.post.return_value = HttpxResponse(
        200, json={"observing": True, "already_active": False}, request=AsyncMock()
    )

    session_id = str(uuid.uuid4())
    payload = {"session_id": session_id, "timestamp": datetime.now(UTC).isoformat()}

    response = await client.post("/projects/my_project_root/observation/start", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["event_type"] == "OBSERVATION_STARTED"
    assert body["project_root"] == "my_project_root"
    mock_instance.post.assert_awaited_once_with("http://localhost:5185/control/observe/start")
    await asyncio.sleep(0.1)


@pytest.mark.asyncio
@patch("app.features.events.router.httpx.AsyncClient")
async def test_stop_observation_success(mock_client_class: AsyncMock, client: AsyncClient) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    mock_instance.post.return_value = HttpxResponse(
        200, json={"observing": False, "already_active": False}, request=AsyncMock()
    )

    session_id = str(uuid.uuid4())
    payload = {"session_id": session_id, "timestamp": datetime.now(UTC).isoformat()}

    response = await client.post("/projects/my_project_root/observation/stop", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["event_type"] == "OBSERVATION_STOPPED"
    mock_instance.post.assert_awaited_once_with("http://localhost:5185/control/observe/stop")

    await asyncio.sleep(0.1)


@pytest.mark.asyncio
@patch("app.features.events.router.httpx.AsyncClient")
async def test_observation_already_started(
    mock_client_class: AsyncMock, client: AsyncClient
) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    mock_instance.post.return_value = HttpxResponse(
        200, json={"observing": True, "already_active": True}, request=AsyncMock()
    )

    payload = {"session_id": str(uuid.uuid4()), "timestamp": datetime.now(UTC).isoformat()}
    response = await client.post("/projects/my_project_root/observation/start", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["event_type"] == "OBSERVATION_STARTED"
    mock_instance.post.assert_awaited_once_with("http://localhost:5185/control/observe/start")

    await asyncio.sleep(0.1)


@pytest.mark.asyncio
@patch("app.features.events.router.httpx.AsyncClient")
async def test_observation_already_stopped(
    mock_client_class: AsyncMock, client: AsyncClient
) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    mock_instance.post.return_value = HttpxResponse(
        200, json={"observing": False, "already_active": True}, request=AsyncMock()
    )

    payload = {"session_id": str(uuid.uuid4()), "timestamp": datetime.now(UTC).isoformat()}
    response = await client.post("/projects/my_project_root/observation/stop", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["event_type"] == "OBSERVATION_STOPPED"
    mock_instance.post.assert_awaited_once_with("http://localhost:5185/control/observe/stop")

    await asyncio.sleep(0.1)


@pytest.mark.asyncio
@patch("app.features.events.router.httpx.AsyncClient")
async def test_observation_daemon_unavailable(
    mock_client_class: AsyncMock, client: AsyncClient
) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    mock_instance.post.side_effect = RequestError("Connection refused")

    payload = {"session_id": str(uuid.uuid4()), "timestamp": datetime.now(UTC).isoformat()}
    response = await client.post("/projects/my_project_root/observation/start", json=payload)

    assert response.status_code == 503
    assert response.json()["detail"] == "Daemon unavailable"


@pytest.mark.asyncio
@patch("app.features.events.router.httpx.AsyncClient")
async def test_observation_daemon_timeout(
    mock_client_class: AsyncMock, client: AsyncClient
) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    mock_instance.post.side_effect = TimeoutException("Timeout")

    payload = {"session_id": str(uuid.uuid4()), "timestamp": datetime.now(UTC).isoformat()}
    response = await client.post("/projects/my_project_root/observation/start", json=payload)

    assert response.status_code == 504
    assert response.json()["detail"] == "Daemon timeout"


@pytest.mark.asyncio
@patch("app.features.events.router.httpx.AsyncClient")
async def test_observation_daemon_returns_500(
    mock_client_class: AsyncMock, client: AsyncClient
) -> None:
    mock_instance = mock_client_class.return_value.__aenter__.return_value
    # Ensure raise_for_status() raises HTTPStatusError implicitly because httpx models it
    # We'll just return a 500 response and let our code call raise_for_status
    # Wait, mock doesn't automatically raise on raise_for_status unless we tell it to.
    # It's better to just mock get to return a 500 response and it handles it!
    # HttpxResponse has a .raise_for_status() method, if we just create a real one it will work.
    mock_instance.post.return_value = HttpxResponse(500, request=AsyncMock(url="http://localhost"))

    payload = {"session_id": str(uuid.uuid4()), "timestamp": datetime.now(UTC).isoformat()}
    response = await client.post("/projects/my_project_root/observation/start", json=payload)

    assert response.status_code == 502
    assert response.json()["detail"] == "Daemon returned error status"
