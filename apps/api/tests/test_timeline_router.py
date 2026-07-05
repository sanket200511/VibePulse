"""
Integration tests for GET /sessions/{session_id}/timeline.

Drives events into existence via POST /events (the same pattern used by
test_session_router.py) so these tests exercise the real
events -> Session Engine -> Timeline integration, not hand-inserted rows.
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
async def test_timeline_returns_404_for_unknown_session(client: AsyncClient) -> None:
    response = await client.get(f"/sessions/{uuid.uuid4()}/timeline")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_timeline_reflects_ingested_events(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    await client.post("/events", json=_event_payload(file_path="/repo/b.py"))
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    response = await client.get(f"/sessions/{session_id}/timeline")

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session_id
    assert body["outcome"]["event_count"] == 2
    assert body["outcome"]["distinct_file_count"] == 2

    kinds = [e["entry_kind"] for e in body["entries"]]
    assert "MARKER" in kinds


@pytest.mark.asyncio
async def test_timeline_entries_split_metadata_and_insights(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload())
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    response = await client.get(f"/sessions/{session_id}/timeline")

    entry = next(e for e in response.json()["entries"] if e["entry_kind"] == "EVENT")
    assert "metadata" in entry
    assert "insights" in entry
    assert "timestamp" in entry["metadata"]
    assert "analyzer_findings" in entry["insights"]


async def _timeline_select_count(client: AsyncClient, session_id: str) -> int:
    queries: list[str] = []

    def _capture(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    sa_event.listen(test_engine.sync_engine, "before_cursor_execute", _capture)
    try:
        response = await client.get(f"/sessions/{session_id}/timeline")
    finally:
        sa_event.remove(test_engine.sync_engine, "before_cursor_execute", _capture)

    assert response.status_code == 200
    return len([q for q in queries if q.strip().upper().startswith("SELECT")])


@pytest.mark.asyncio
async def test_timeline_query_count_does_not_grow_with_event_count(
    client: AsyncClient,
) -> None:
    """
    Timeline generation must not N+1 — the number of SELECTs issued while
    building the timeline is the same whether a session has 2 events or 10
    (session lookup + one events range query + one bulk analyses lookup),
    never one query per event.
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

    small_session_id = await _seed("/repo/small", 2)
    large_session_id = await _seed("/repo/large", 10)

    small_count = await _timeline_select_count(client, small_session_id)
    large_count = await _timeline_select_count(client, large_session_id)

    assert small_count == large_count
