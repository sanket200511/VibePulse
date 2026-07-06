"""
Integration tests for GET /sessions/{session_id}/replay.

Drives events into existence via POST /events (mirroring
test_timeline_router.py/test_insights_router.py), then completes the
session directly through the Session Engine's own service layer (not by
hand-writing SQL) before exercising the replay endpoint, since a session
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
async def test_replay_returns_404_for_unknown_session(client: AsyncClient) -> None:
    response = await client.get(f"/sessions/{uuid.uuid4()}/replay")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_replay_returns_409_for_active_session(client: AsyncClient) -> None:
    await client.post("/events", json=_event_payload())
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]

    response = await client.get(f"/sessions/{session_id}/replay")

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_replay_reflects_ingested_events_once_completed(
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

    response = await client.get(f"/sessions/{session_id}/replay")

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session_id
    assert len(body["frames"]) >= 3  # SESSION_START + 2 events + SESSION_END
    assert len(body["chapters"]) >= 1
    assert body["chapters"][0]["kind"] == "SESSION_STARTED"
    assert body["chapters"][-1]["kind"] == "SESSION_COMPLETED"


@pytest.mark.asyncio
async def test_replay_frames_reuse_timeline_entry_shape(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await client.post("/events", json=_event_payload(file_path="/repo/a.py"))
    session_id = (await client.get("/sessions")).json()["sessions"][0]["id"]
    await _complete_session(db_session, session_id)

    response = await client.get(f"/sessions/{session_id}/replay")

    frame = next(f for f in response.json()["frames"] if f["kind"] == "EVENT")
    assert "metadata" in frame
    assert "insights" in frame
    assert "timestamp" in frame["metadata"]
    assert "analyzer_findings" in frame["insights"]
    assert "chapter_id" in frame
    assert "is_chapter_start" in frame


@pytest.mark.asyncio
async def test_replay_chapters_cover_every_frame_contiguously(
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

    response = await client.get(f"/sessions/{session_id}/replay")
    body = response.json()

    covered: set[int] = set()
    for chapter in body["chapters"]:
        for i in range(chapter["start_frame_index"], chapter["end_frame_index"] + 1):
            covered.add(i)
    assert covered == set(range(len(body["frames"])))


async def _replay_select_count(client: AsyncClient, session_id: str) -> int:
    queries: list[str] = []

    def _capture(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    sa_event.listen(test_engine.sync_engine, "before_cursor_execute", _capture)
    try:
        response = await client.get(f"/sessions/{session_id}/replay")
    finally:
        sa_event.remove(test_engine.sync_engine, "before_cursor_execute", _capture)

    assert response.status_code == 200
    return len([q for q in queries if q.strip().upper().startswith("SELECT")])


@pytest.mark.asyncio
async def test_replay_query_count_does_not_grow_with_event_count(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """
    Replay generation must not N+1 -- the number of SELECTs issued while
    building a replay is the same whether a session has 2 events or 10
    (session lookup + Timeline's own two queries; Replay adds none of its
    own since it does not consult Insights, ADR 0008 §4).
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

    small_session_id = await _seed("/repo/replay-small", 2)
    large_session_id = await _seed("/repo/replay-large", 10)

    small_count = await _replay_select_count(client, small_session_id)
    large_count = await _replay_select_count(client, large_session_id)

    assert small_count == large_count
