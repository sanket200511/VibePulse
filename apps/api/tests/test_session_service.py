"""
Tests for the Session Engine's lifecycle decisions.

Exercises service.py directly against the real Postgres db_session fixture
(see conftest.py) — session boundary decisions depend on actual persisted
state (the "most recent non-COMPLETED session for this project" query).
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.core.config import get_settings
from app.core.domain.events import AnalyzableEvent
from app.features.sessions import service
from app.features.sessions.constants import SessionStatus
from app.features.sessions.models import Session
from sqlalchemy.ext.asyncio import AsyncSession

settings = get_settings()


def _event(**overrides: object) -> AnalyzableEvent:
    base = {
        "id": uuid.uuid4(),
        "event_type": "FILE_MODIFIED",
        "timestamp": datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
        "session_id": uuid.uuid4(),
        "project_root": "/home/dev/vibepulse",
        "file_path": "/home/dev/vibepulse/app/main.py",
        "file_name": "main.py",
        "file_extension": ".py",
        "language": "python",
        "git_branch": "main",
        "metadata": {},
    }
    base.update(overrides)
    return AnalyzableEvent(**base)


@pytest.mark.asyncio
async def test_touch_session_creates_new_session_for_first_event(db_session: AsyncSession) -> None:
    event = _event()

    session, was_created = await service.touch_session(db_session, event)

    assert was_created is True
    assert session.project_root == event.project_root
    assert session.status == SessionStatus.ACTIVE.value
    assert session.event_count == 1
    assert session.events_by_type == {"FILE_MODIFIED": 1}
    assert session.languages == {"python": 1}
    assert session.files == {event.file_path: 1}
    # Identity is server-owned — never equal to the daemon's session_id.
    assert session.id != event.session_id
    assert session.daemon_session_id == event.session_id


@pytest.mark.asyncio
async def test_touch_session_extends_existing_session_within_timeout(
    db_session: AsyncSession,
) -> None:
    first = _event(timestamp=datetime(2026, 7, 4, 9, 0, tzinfo=UTC))
    second = _event(
        timestamp=datetime(2026, 7, 4, 9, 1, tzinfo=UTC),
        file_path="/home/dev/vibepulse/app/other.py",
        language="python",
    )

    created, _ = await service.touch_session(db_session, first)
    extended, was_created = await service.touch_session(db_session, second)

    assert was_created is False
    assert extended.id == created.id
    assert extended.event_count == 2
    assert extended.languages == {"python": 2}
    assert set(extended.files.keys()) == {first.file_path, second.file_path}


@pytest.mark.asyncio
async def test_touch_session_starts_new_session_after_completion_window(
    db_session: AsyncSession,
) -> None:
    first = _event(timestamp=datetime(2026, 7, 4, 9, 0, tzinfo=UTC))
    far_gap = timedelta(
        seconds=settings.session_idle_timeout_seconds
        + settings.session_completion_timeout_seconds
        + 1
    )
    second = _event(timestamp=first.timestamp + far_gap, file_path="/home/dev/vibepulse/app/b.py")

    created, _ = await service.touch_session(db_session, first)
    new_session, was_created = await service.touch_session(db_session, second)

    assert was_created is True
    assert new_session.id != created.id
    assert new_session.event_count == 1

    # The stale session was lazily finalized rather than left dangling.
    await db_session.refresh(created)
    assert created.status == SessionStatus.COMPLETED.value
    assert created.summary is not None


@pytest.mark.asyncio
async def test_touch_session_reactivates_idle_session_within_grace_window(
    db_session: AsyncSession,
) -> None:
    first = _event(timestamp=datetime(2026, 7, 4, 9, 0, tzinfo=UTC))
    idle_gap = timedelta(seconds=settings.session_idle_timeout_seconds + 5)
    second = _event(timestamp=first.timestamp + idle_gap, file_path="/home/dev/vibepulse/app/b.py")

    created, _ = await service.touch_session(db_session, first)
    resumed, was_created = await service.touch_session(db_session, second)

    assert was_created is False
    assert resumed.id == created.id
    assert resumed.status == SessionStatus.ACTIVE.value
    assert resumed.event_count == 2


def test_compute_effective_status_reports_idle_after_gap() -> None:
    session = Session(
        id=uuid.uuid4(),
        project_root="/repo",
        status=SessionStatus.ACTIVE.value,
        started_at=datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
        last_event_at=datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
        event_count=1,
        events_by_type={},
        languages={},
        files={},
    )
    now = session.last_event_at + timedelta(seconds=settings.session_idle_timeout_seconds + 1)

    assert service.compute_effective_status(session, now) == SessionStatus.IDLE


def test_compute_effective_status_completed_is_terminal() -> None:
    session = Session(
        id=uuid.uuid4(),
        project_root="/repo",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
        last_event_at=datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
        event_count=1,
        events_by_type={},
        languages={},
        files={},
    )
    far_future = session.last_event_at + timedelta(days=30)

    assert service.compute_effective_status(session, far_future) == SessionStatus.COMPLETED


@pytest.mark.asyncio
async def test_sweep_once_transitions_active_to_idle(db_session: AsyncSession) -> None:
    now = datetime.now(tz=UTC)
    stale = Session(
        id=uuid.uuid4(),
        project_root="/repo",
        status=SessionStatus.ACTIVE.value,
        started_at=now - timedelta(seconds=settings.session_idle_timeout_seconds + 100),
        last_event_at=now - timedelta(seconds=settings.session_idle_timeout_seconds + 10),
        event_count=3,
        events_by_type={"FILE_MODIFIED": 3},
        languages={"python": 3},
        files={"a.py": 3},
    )
    db_session.add(stale)
    await db_session.flush()

    result = await service.sweep_once(db_session)

    assert [s.id for s in result.idled] == [stale.id]
    assert result.completed == []
    assert stale.status == SessionStatus.IDLE.value


@pytest.mark.asyncio
async def test_sweep_once_transitions_idle_to_completed_with_summary(
    db_session: AsyncSession,
) -> None:
    now = datetime.now(tz=UTC)
    total_silence = timedelta(
        seconds=settings.session_idle_timeout_seconds
        + settings.session_completion_timeout_seconds
        + 10
    )
    stale = Session(
        id=uuid.uuid4(),
        project_root="/repo",
        status=SessionStatus.IDLE.value,
        started_at=now - total_silence - timedelta(minutes=20),
        last_event_at=now - total_silence,
        event_count=5,
        events_by_type={"FILE_MODIFIED": 5},
        languages={"python": 5},
        files={"a.py": 5},
    )
    db_session.add(stale)
    await db_session.flush()

    result = await service.sweep_once(db_session)

    assert result.idled == []
    assert [s.id for s in result.completed] == [stale.id]
    assert stale.status == SessionStatus.COMPLETED.value
    assert stale.ended_at == stale.last_event_at
    assert stale.summary is not None
    assert stale.summary["primary_language"] == "python"


@pytest.mark.asyncio
async def test_sweep_once_leaves_recent_active_session_untouched(
    db_session: AsyncSession,
) -> None:
    now = datetime.now(tz=UTC)
    fresh = Session(
        id=uuid.uuid4(),
        project_root="/repo",
        status=SessionStatus.ACTIVE.value,
        started_at=now,
        last_event_at=now,
        event_count=1,
        events_by_type={},
        languages={},
        files={},
    )
    db_session.add(fresh)
    await db_session.flush()

    result = await service.sweep_once(db_session)

    assert result.idled == []
    assert result.completed == []
    assert fresh.status == SessionStatus.ACTIVE.value


@pytest.mark.asyncio
async def test_touch_session_multi_project_isolation(
    db_session: AsyncSession,
) -> None:
    now = datetime.now(tz=UTC)
    event_proj_a = _event(
        project_root="D:/Projects/ProjectAlpha",
        timestamp=now,
    )
    event_proj_b = _event(
        project_root="D:/Projects/ProjectBeta",
        timestamp=now + timedelta(seconds=1),
    )

    session_a, was_created_a = await service.touch_session(db_session, event_proj_a)
    session_b, was_created_b = await service.touch_session(db_session, event_proj_b)

    assert was_created_a is True
    assert was_created_b is True
    assert session_a.id != session_b.id
    assert session_a.project_id != session_b.project_id
    assert session_a.project_root == "D:/Projects/ProjectAlpha"
    assert session_b.project_root == "D:/Projects/ProjectBeta"
