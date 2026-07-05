"""
Timeline router.

REST:
  GET /sessions/{session_id}/timeline — chronological narrative of a session

Registered under the `timeline` feature module but mounted under the
`/sessions` path — mirrors the analysis feature's precedent of
GET /events/{event_id}/analysis: a computed sub-resource of a parent, not an
independently stored resource. See docs/adr/0006-session-timeline.md.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.timeline import service
from app.features.timeline.schemas import TimelineRead

router = APIRouter(tags=["timeline"])
logger = get_logger(__name__)


@router.get(
    "/sessions/{session_id}/timeline",
    response_model=TimelineRead,
    summary="Get the chronological timeline for a session",
)
async def get_session_timeline(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TimelineRead:
    timeline = await service.get_timeline(db, session_id)
    if timeline is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    logger.info(
        "timeline_generated",
        extra={"session_id": str(session_id), "entry_count": len(timeline.entries)},
    )
    return TimelineRead.from_timeline(session_id, datetime.now(tz=UTC), timeline)
