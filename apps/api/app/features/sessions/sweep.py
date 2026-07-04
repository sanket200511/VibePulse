"""
In-process sweep loop for session timeout detection.

Started/stopped from app.main's lifespan handler — the same hook already
reserved there for future background workers. Runs as a plain asyncio task;
no Redis/Celery/APScheduler needed for a single-instance API (consistent
with the direct-HTTP interim documented in docs/adr/0003-event-driven-core.md).
"""

from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.features.sessions import service
from app.features.sessions.connection_manager import session_connection_manager
from app.features.sessions.models import Session
from app.features.sessions.schemas import SessionRead

logger = get_logger(__name__)


def _to_read(session: Session) -> SessionRead:
    effective_status = service.compute_effective_status(session, session.updated_at)
    return SessionRead.from_session(session, effective_status=effective_status)


async def _run_once() -> None:
    async with AsyncSessionLocal() as db:
        try:
            result = await service.sweep_once(db)
            await db.commit()
        except Exception:
            await db.rollback()
            logger.error("session_sweep_error", exc_info=True)
            return

    for session in result.idled:
        await session_connection_manager.broadcast(
            {
                "type": "session.idle",
                "session": _to_read(session).model_dump(mode="json"),
            }
        )
    for session in result.completed:
        await session_connection_manager.broadcast(
            {
                "type": "session.completed",
                "session": _to_read(session).model_dump(mode="json"),
            }
        )

    if result.idled or result.completed:
        logger.info(
            "session_sweep_complete",
            extra={"idled": len(result.idled), "completed": len(result.completed)},
        )


async def run_sweep_loop() -> None:
    """Runs _run_once() forever on the configured interval, until cancelled."""
    interval = get_settings().session_sweep_interval_seconds
    while True:
        try:
            await asyncio.sleep(interval)
            await _run_once()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.error("session_sweep_loop_error", exc_info=True)
