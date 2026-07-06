"""
Integration tests for GET /sessions/{session_id}/health.

Drives events into existence via POST /events (mirroring
test_replay_router.py/test_insights_router.py), then completes the session
directly through the Session Engine's own service layer (not by
hand-writing SQL) before exercising the health endpoint, since a session
only reaches COMPLETED in production via the sweep loop's timeout logic.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.features.sessions import service as session_service
from httpx import AsyncClient
from sqlalchemy import event as sa_event
from sqlalchemy.ext.asyncio import AsyncSession

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


async def _complete_session(db_session: AsyncSession, session_id: str) -> None:
    """Force a session straight to COMPLETED via the real Session Engine
    finalize path, rather than hand-writing SQL, so these tests exercise the
    same transition production relies on (docs/adr/0005-session-engine.md)."""
    session = await session_service.get_session(db_session, uuid.UUID(session_id))
    assert session is not None
    session_service._finalize(session, session.last_event_at + timedelta(seconds=1))
    await db_session.commit()


@pytest.mark.asyncio
async def test_health_returns_404_for_unknown_session(client: AsyncClient) -> None:
    response = await client.get(f"/sessions/{uuid.uuid4()}/health")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_health_returns_409_for_active_session(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload())
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    response = await client.get(f"/sessions/{session_id}/health")

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_health_reflects_ingested_events_once_completed(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    await client.post(
        "/events",
        json=_event_payload(
            file_path="/repo/b.py",
            timestamp=(datetime.now(UTC) + timedelta(seconds=5)).isoformat(),
        ),
    )
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]
    await _complete_session(db_session, session_id)

    response = await client.get(f"/sessions/{session_id}/health")

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session_id
    assert "summary" in body
    assert body["summary"]["narrative"]
    assert isinstance(body["summary"]["guidance"], list)


@pytest.mark.asyncio
async def test_health_metric_shape_exposes_label_headline_and_metrics(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]
    await _complete_session(db_session, session_id)

    response = await client.get(f"/sessions/{session_id}/health")

    body = response.json()
    assert body["metrics"], "expected at least one metric to be present"
    for metric in body["metrics"].values():
        assert "label" in metric
        assert "headline" in metric
        assert "metrics" in metric
        assert "category" in metric


@pytest.mark.asyncio
async def test_health_report_never_exposes_a_score_field(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]
    await _complete_session(db_session, session_id)

    response = await client.get(f"/sessions/{session_id}/health")

    body = response.json()
    assert "score" not in body
    assert "score" not in body["summary"]
    for metric in body["metrics"].values():
        assert "score" not in metric


async def _health_select_count(client: AsyncClient, session_id: str) -> int:
    queries: list[str] = []

    def _capture(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    sa_event.listen(test_engine.sync_engine, "before_cursor_execute", _capture)
    try:
        response = await client.get(f"/sessions/{session_id}/health")
    finally:
        sa_event.remove(test_engine.sync_engine, "before_cursor_execute", _capture)

    assert response.status_code == 200
    return len([q for q in queries if q.strip().upper().startswith("SELECT")])


@pytest.mark.asyncio
async def test_health_query_count_does_not_grow_with_event_count(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """
    Health generation must not N+1 -- the number of SELECTs issued while
    building a health report is the same whether a session has 2 events or
    10 (Health composes Timeline + Replay, neither of which grows with
    event count either, per their own ADRs).
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
        session_id = next(s["id"] for s in sessions if s["project_root"] == project_root)
        await _complete_session(db_session, session_id)
        return session_id

    small_session_id = await _seed("/repo/health-small", 2)
    large_session_id = await _seed("/repo/health-large", 10)

    small_count = await _health_select_count(client, small_session_id)
    large_count = await _health_select_count(client, large_session_id)

    assert small_count == large_count
