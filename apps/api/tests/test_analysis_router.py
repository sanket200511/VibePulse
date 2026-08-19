"""
Integration tests for GET /events/{event_id}/analysis.

Exercises the real router + Postgres round-trip.  Analysis rows are written
by calling ``analysis_service.dispatch()`` directly so tests control exactly
which findings land in the database without depending on BackgroundTasks
timing.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.analysis import service as analysis_service
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _event_payload(**overrides: object) -> dict:
    base = {
        "event_type": "FILE_MODIFIED",
        "timestamp": datetime.now(UTC).isoformat(),
        "session_id": str(uuid.uuid4()),
        "project_root": "/repo",
        "file_path": "/repo/src/app.py",
        "file_name": "app.py",
        "file_extension": ".py",
        "language": "python",
        "git_branch": "feat/analysis",
        "metadata": {},
    }
    base.update(overrides)
    return base


def _analyzable_from_response(body: dict) -> AnalyzableEvent:
    """Build an AnalyzableEvent from an ingest response body."""
    return AnalyzableEvent(
        id=uuid.UUID(body["id"]),
        event_type=body["event_type"],
        timestamp=datetime.fromisoformat(body["timestamp"]),
        session_id=uuid.UUID(body["session_id"]),
        project_root=body["project_root"],
        file_path=body["file_path"],
        file_name=body["file_name"],
        file_extension=body.get("file_extension"),
        language=body.get("language"),
        git_branch=body.get("git_branch"),
        metadata=body.get("metadata", {}),
    )


# ---------------------------------------------------------------------------
# 404 — event does not exist
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_analysis_404_for_unknown_event(client: AsyncClient) -> None:
    random_id = uuid.uuid4()
    response = await client.get(f"/events/{random_id}/analysis")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_analysis_404_detail_mentions_event_id(client: AsyncClient) -> None:
    random_id = uuid.uuid4()
    response = await client.get(f"/events/{random_id}/analysis")

    assert str(random_id) in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_analysis_404_for_malformed_uuid(client: AsyncClient) -> None:
    response = await client.get("/events/not-a-uuid/analysis")

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 200 with empty analyses list
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_analysis_200_empty_list_when_no_analyses(
    db_session: AsyncSession,
    client: AsyncClient,
) -> None:
    """Event exists but analysis has not run yet — should return empty list."""
    from app.features.events.models import DevelopmentEvent

    event = DevelopmentEvent(
        id=uuid.uuid4(),
        schema_version=1,
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(UTC),
        session_id=uuid.uuid4(),
        project_root="/repo",
        file_path="/repo/src/app.py",
        file_name="app.py",
        file_extension=".py",
        language="python",
        git_branch="feat/analysis",
        event_metadata={},
    )
    db_session.add(event)
    await db_session.commit()

    response = await client.get(f"/events/{event.id}/analysis")

    assert response.status_code == 200
    body = response.json()
    assert body["event_id"] == str(event.id)
    assert body["analyses"] == []


# ---------------------------------------------------------------------------
# 200 with analyses after dispatch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_analysis_200_with_analyses_after_dispatch(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """After dispatch(), findings are persisted and returned by the endpoint."""
    ingest = await client.post("/events", json=_event_payload())
    assert ingest.status_code == 201
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")

    assert response.status_code == 200
    body = response.json()
    assert body["event_id"] == str(event.id)
    assert len(body["analyses"]) > 0


@pytest.mark.asyncio
async def test_get_analysis_response_has_expected_analyzer_names(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    ingest = await client.post("/events", json=_event_payload())
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    names = {a["analyzer_name"] for a in response.json()["analyses"]}

    # All four registered analyzers must have produced a finding.
    assert {"language", "file_metadata", "git_context", "activity_rate"} <= names


@pytest.mark.asyncio
async def test_get_analysis_response_schema_shape(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Validate every required field is present in each analysis item."""
    ingest = await client.post("/events", json=_event_payload())
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    for item in response.json()["analyses"]:
        assert "id" in item
        assert "event_id" in item
        assert "analyzer_name" in item
        assert "analyzer_version" in item
        assert "findings" in item
        assert "duration_ms" in item
        assert "created_at" in item
        assert isinstance(item["findings"], dict)
        assert isinstance(item["duration_ms"], float | int)


@pytest.mark.asyncio
async def test_get_analysis_duration_ms_is_non_negative(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    ingest = await client.post("/events", json=_event_payload())
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    for item in response.json()["analyses"]:
        assert item["duration_ms"] >= 0


# ---------------------------------------------------------------------------
# Idempotency: re-running dispatch does not duplicate rows
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dispatch_twice_does_not_duplicate_analyses(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    ingest = await client.post("/events", json=_event_payload())
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)
    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    names = [a["analyzer_name"] for a in response.json()["analyses"]]

    # Each analyzer name must appear at most once — upsert must have fired.
    assert len(names) == len(set(names))


# ---------------------------------------------------------------------------
# Findings content spot-checks
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_language_analyzer_findings_for_python_file(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    payload = _event_payload(
        file_path="/repo/src/main.py",
        file_name="main.py",
        file_extension=".py",
        language=None,
    )
    ingest = await client.post("/events", json=payload)
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    analyses = {a["analyzer_name"]: a["findings"] for a in response.json()["analyses"]}
    lang = analyses["language"]

    assert lang["detected_language"] == "python"
    assert lang["file_category"] == "source"
    assert lang["is_source_file"] is True


@pytest.mark.asyncio
async def test_git_context_analyzer_classifies_feature_branch(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    payload = _event_payload(git_branch="feat/my-feature")
    ingest = await client.post("/events", json=payload)
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    analyses = {a["analyzer_name"]: a["findings"] for a in response.json()["analyses"]}

    assert analyses["git_context"]["branch_type"] == "feature"
    assert analyses["git_context"]["branch_prefix"] == "feat"


@pytest.mark.asyncio
async def test_file_metadata_analyzer_detects_test_file(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    payload = _event_payload(
        file_path="/repo/tests/test_service.py",
        file_name="test_service.py",
        file_extension=".py",
    )
    ingest = await client.post("/events", json=payload)
    event = _analyzable_from_response(ingest.json())

    await analysis_service.dispatch(event, test_session_factory)

    response = await client.get(f"/events/{event.id}/analysis")
    analyses = {a["analyzer_name"]: a["findings"] for a in response.json()["analyses"]}

    assert analyses["file_metadata"]["is_test_file"] is True
