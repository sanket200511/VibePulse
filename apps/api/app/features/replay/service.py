"""
Replay service — the only entry point for computing a Session Replay.

No persistence: every call recomputes the replay fresh from Timeline +
Session (docs/adr/0008-replay-engine.md §1, §7). No new table, no new
writes, no changes to sessions/service.py or timeline/service.py.

NOTE: intentional cross-feature import -- Replay exists specifically to
compose data from sessions and timeline into a projection, so this service
(not a router) is the integration seam, mirroring the precedent set by
timeline/service.py and insights/service.py.

Replay additionally gates on session status: only a COMPLETED session may
be replayed (ADR 0008 §5) — enforced here by raising ConflictError, which
the router translates into a 409 response.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.features.replay.domain import Replay, render
from app.features.sessions import service as session_service
from app.features.sessions.constants import SessionStatus
from app.features.timeline import service as timeline_service


async def get_replay(db: AsyncSession, session_id: uuid.UUID) -> Replay | None:
    """
    Build the replay for ``session_id``, or ``None`` if no such session
    exists. Raises ConflictError if the session exists but has not reached
    SessionStatus.COMPLETED yet -- replaying a still-in-progress session
    would race against new events arriving mid-playback (ADR 0008 §5).
    """
    session = await session_service.get_session(db, session_id)
    if session is None:
        return None

    if SessionStatus(session.status) != SessionStatus.COMPLETED:
        raise ConflictError(
            f"Session {session_id} is not COMPLETED yet and cannot be replayed.",
            code="session_not_completed",
        )

    timeline = await timeline_service.get_timeline(db, session_id)
    if timeline is None:
        return None

    return render(
        timeline.entries,
        session_id=session_id,
        generated_at=datetime.now(tz=UTC),
    )
