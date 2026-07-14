"""
Session Engine — owns every session lifecycle decision.

The daemon is a plain event producer: its per-process ``session_id`` is
recorded as a hint (``Session.daemon_session_id``) but is never trusted as
the authority on session boundaries. This module alone decides whether an
incoming event continues an existing session or starts a new one, and when a
session moves through ACTIVE -> IDLE -> COMPLETED. See
docs/adr/0005-session-engine.md.

Boundary rule
-------------
For a given ``project_root``, the most recent non-COMPLETED session is
extended if the gap since its last event is within
``idle_timeout + completion_timeout``. Once a session is COMPLETED it is
terminal — a later event always starts a brand new session rather than
reactivating it (this is what makes the IDLE buffer meaningful: a session
gets one grace window to resume before it is considered genuinely over).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.domain.events import AnalyzableEvent
from app.core.logging import get_logger
from app.features.sessions.constants import SessionStatus
from app.features.sessions.models import Session
from app.features.sessions.summary import DEFAULT_SUMMARY_GENERATOR, SessionSnapshot

logger = get_logger(__name__)

DEFAULT_LIST_LIMIT = 20


@dataclass
class SweepResult:
    """Sessions transitioned by one sweep pass, grouped by transition kind."""

    idled: list[Session]
    completed: list[Session]


def _idle_timeout() -> timedelta:
    return timedelta(seconds=get_settings().session_idle_timeout_seconds)


def _completion_timeout() -> timedelta:
    return timedelta(seconds=get_settings().session_completion_timeout_seconds)


def compute_effective_status(session: Session, now: datetime) -> SessionStatus:
    """
    Pure function deriving the *reportable* status of a session at ``now``.

    A session already persisted as COMPLETED stays COMPLETED. An ACTIVE
    session whose last event is older than the idle timeout is reported as
    IDLE even if the sweep loop has not yet persisted that transition — reads
    are always accurate regardless of sweep timing.
    """
    status = SessionStatus(session.status)
    if status == SessionStatus.COMPLETED:
        return status

    gap = now - session.last_event_at
    if gap >= _idle_timeout():
        return SessionStatus.IDLE
    return status


def _to_snapshot(session: Session) -> SessionSnapshot:
    return SessionSnapshot(
        project_root=session.project_root,
        started_at=session.started_at,
        last_event_at=session.last_event_at,
        event_count=session.event_count,
        events_by_type=session.events_by_type,
        languages=session.languages,
        files=session.files,
        git_branch=session.git_branch,
    )


def _finalize(session: Session, now: datetime) -> None:
    """Transition a session to COMPLETED, generating its summary in place."""
    summary = DEFAULT_SUMMARY_GENERATOR.generate(_to_snapshot(session))
    session.status = SessionStatus.COMPLETED.value
    session.ended_at = session.last_event_at
    session.summary = {
        "headline": summary.headline,
        "duration_seconds": summary.duration_seconds,
        "event_count": summary.event_count,
        "primary_language": summary.primary_language,
        "distinct_file_count": summary.distinct_file_count,
        "dominant_event_type": summary.dominant_event_type,
    }
    session.updated_at = now


def _apply_event(session: Session, event: AnalyzableEvent) -> None:
    session.last_event_at = event.timestamp
    session.event_count += 1
    session.events_by_type = {
        **session.events_by_type,
        event.event_type: session.events_by_type.get(event.event_type, 0) + 1,
    }
    if event.language:
        session.languages = {
            **session.languages,
            event.language: session.languages.get(event.language, 0) + 1,
        }
    if event.file_path:
        session.files = {
            **session.files,
            event.file_path: session.files.get(event.file_path, 0) + 1,
        }
    if event.git_branch:
        session.git_branch = event.git_branch
    if session.status != SessionStatus.ACTIVE.value:
        session.status = SessionStatus.ACTIVE.value
    session.updated_at = event.timestamp


def _new_session(event: AnalyzableEvent) -> Session:
    session = Session(
        id=uuid.uuid4(),
        project_root=event.project_root,
        daemon_session_id=event.session_id,
        status=SessionStatus.ACTIVE.value,
        started_at=event.timestamp,
        last_event_at=event.timestamp,
        event_count=1,
        events_by_type={event.event_type: 1},
        languages={event.language: 1} if event.language else {},
        files={event.file_path: 1} if event.file_path else {},
        git_branch=event.git_branch,
    )
    return session


async def touch_session(db: AsyncSession, event: AnalyzableEvent) -> tuple[Session, bool]:
    """
    Attach ``event`` to a session, deciding continuation vs. new session.

    Returns ``(session, was_created)`` so the caller (events router) can
    broadcast ``session.started`` vs. ``session.updated`` accordingly.
    """
    stmt = (
        select(Session)
        .where(
            Session.project_root == event.project_root,
            Session.status != SessionStatus.COMPLETED.value,
        )
        .order_by(Session.last_event_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if candidate is not None:
        gap = event.timestamp - candidate.last_event_at
        if gap <= _idle_timeout() + _completion_timeout():
            _apply_event(candidate, event)
            return candidate, False

        # The candidate has been silent long enough that it should already be
        # COMPLETED — the sweep loop just hasn't caught up yet. Finalize it
        # now so this event correctly starts a fresh session rather than
        # reactivating a session that is, in effect, already over.
        _finalize(candidate, datetime.now(tz=UTC))
        logger.info(
            "session_lazily_completed",
            extra={"session_id": str(candidate.id), "project_root": candidate.project_root},
        )

    new_session = _new_session(event)
    db.add(new_session)
    await db.flush()
    logger.info(
        "session_started",
        extra={"session_id": str(new_session.id), "project_root": new_session.project_root},
    )
    return new_session, True


async def list_sessions(db: AsyncSession, limit: int = DEFAULT_LIST_LIMIT) -> list[Session]:
    stmt = select(Session).order_by(Session.last_event_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_session(db: AsyncSession, session_id: uuid.UUID) -> Session | None:
    return await db.get(Session, session_id)


async def get_current_session(db: AsyncSession) -> Session | None:
    """Most recently active session that has not yet completed, if any."""
    stmt = (
        select(Session)
        .where(Session.status != SessionStatus.COMPLETED.value)
        .order_by(Session.last_event_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def sweep_once(db: AsyncSession) -> SweepResult:
    """
    Persist any lifecycle transitions that are due.

    ACTIVE sessions silent for >= idle_timeout become IDLE.
    IDLE sessions silent for >= idle_timeout + completion_timeout become
    COMPLETED (summary generated at that point).

    Does not commit — the caller owns the transaction (mirrors the rest of
    the codebase's separation of mutation from commit boundary).
    """
    now = datetime.now(tz=UTC)
    idle_cutoff = now - _idle_timeout()
    completed_cutoff = now - _idle_timeout() - _completion_timeout()

    idled: list[Session] = []
    active_result = await db.execute(
        select(Session).where(
            Session.status == SessionStatus.ACTIVE.value,
            Session.last_event_at <= idle_cutoff,
        )
    )
    for session in active_result.scalars().all():
        session.status = SessionStatus.IDLE.value
        session.updated_at = now
        idled.append(session)

    completed: list[Session] = []
    idle_result = await db.execute(
        select(Session).where(
            Session.status == SessionStatus.IDLE.value,
            Session.last_event_at <= completed_cutoff,
        )
    )
    for session in idle_result.scalars().all():
        _finalize(session, now)
        completed.append(session)

    await db.flush()
    return SweepResult(idled=idled, completed=completed)
