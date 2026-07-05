"""
Integration tests for GET /sessions/{session_id}/profile and
GET /sessions/{session_id}/insights.

Drives events into existence via POST /events, mirroring
test_timeline_router.py's approach of exercising the real
events -> Session Engine -> Timeline -> Insights integration.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import event as sa_event

from tests.conftest import test_engine


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
async def test_profile_returns_404_for_unknown_session(client: AsyncClient) -> None:
    response = await client.get(f"/sessions/{uuid.uuid4()}/profile")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_insights_returns_404_for_unknown_session(client: AsyncClient) -> None:
    response = await client.get(f"/sessions/{uuid.uuid4()}/insights")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_profile_reflects_ingested_events(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    await client.post(
        "/events",
        json=_event_payload(
            file_path="/repo/a.py",
            timestamp=(datetime.now(UTC) + timedelta(seconds=5)).isoformat(),
        ),
    )
    await client.post(
        "/events",
        json=_event_payload(
            file_path="/repo/b.py",
            timestamp=(datetime.now(UTC) + timedelta(seconds=10)).isoformat(),
        ),
    )
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    response = await client.get(f"/sessions/{session_id}/profile")

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session_id
    assert "SESSION_STATISTICS" in body["categories"]
    assert "FILES" in body["categories"]
    assert "/repo/a.py" in body["categories"]["FILES"][0]["headline"]
    assert "metrics" in body["categories"]["FILES"][0]
    assert "evidence" in body["categories"]["FILES"][0]


@pytest.mark.asyncio
async def test_insights_flattened_list_matches_profile_categories(
    client: AsyncClient,
) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    profile_response = await client.get(f"/sessions/{session_id}/profile")
    insights_response = await client.get(f"/sessions/{session_id}/insights")

    assert insights_response.status_code == 200
    profile_body = profile_response.json()
    insights_body = insights_response.json()

    expected_count = sum(len(v) for v in profile_body["categories"].values())
    assert len(insights_body["insights"]) == expected_count


async def _profile_select_count(client: AsyncClient, session_id: str) -> int:
    queries: list[str] = []

    def _capture(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    sa_event.listen(test_engine.sync_engine, "before_cursor_execute", _capture)
    try:
        response = await client.get(f"/sessions/{session_id}/profile")
    finally:
        sa_event.remove(test_engine.sync_engine, "before_cursor_execute", _capture)

    assert response.status_code == 200
    return len([q for q in queries if q.strip().upper().startswith("SELECT")])


@pytest.mark.asyncio
async def test_profile_query_count_does_not_grow_with_event_count(
    client: AsyncClient,
) -> None:
    """
    Profile generation recomputes on every call (no persistence, approved
    refinement #3) but must still not N+1 -- the number of SELECTs issued is
    the same whether a session has 2 events or 10.
    """

    async def _seed(project_root: str, event_count: int) -> str:
        for i in range(event_count):
            await client.post(
                "/events",
                json=_event_payload(
                    project_root=project_root,
                    file_path=f"{project_root}/file_{i}.py",
                    timestamp=(datetime.now(UTC) + timedelta(seconds=i)).isoformat(),
                ),
            )
        sessions = (await client.get("/sessions")).json()["sessions"]
        return next(s["id"] for s in sessions if s["project_root"] == project_root)

    small_session_id = await _seed("/repo/profile-small", 2)
    large_session_id = await _seed("/repo/profile-large", 10)

    small_count = await _profile_select_count(client, small_session_id)
    large_count = await _profile_select_count(client, large_session_id)

    assert small_count == large_count
