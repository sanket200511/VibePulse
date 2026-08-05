"""
Architecture Timeline router.

GET /sessions/{session_id}/architecture
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.architecture_timeline import service
from app.features.architecture_timeline.schemas import ArchitectureTimelineRead
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["architecture_timeline"])
logger = get_logger(__name__)


@router.get(
    "/sessions/{session_id}/architecture",
    response_model=ArchitectureTimelineRead,
    summary="Get the architecture timeline for a session",
)
async def get_session_architecture_timeline(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ArchitectureTimelineRead:
    timeline = await service.get_architecture_timeline(db, session_id)
    if timeline is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    logger.info(
        "architecture_timeline_generated",
        extra={"session_id": str(session_id), "entry_count": len(timeline.entries)},
    )
    return ArchitectureTimelineRead.from_timeline(session_id, datetime.now(tz=UTC), timeline)
