"""
Replay router.

REST:
  GET /sessions/{session_id}/replay — chronological frames + derived chapters

Registered under the `replay` feature module but mounted under the
`/sessions` path — mirrors timeline's and insights' precedent of a computed
sub-resource, not an independently stored one. See
docs/adr/0008-replay-engine.md.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ConflictError
from app.core.logging import get_logger
from app.features.replay import service
from app.features.replay.schemas import ReplayRead

router = APIRouter(tags=["replay"])
logger = get_logger(__name__)


@router.get(
    "/sessions/{session_id}/replay",
    response_model=ReplayRead,
    summary="Get the replay (frames + chapters) for a completed session",
)
async def get_session_replay(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ReplayRead:
    try:
        replay = await service.get_replay(db, session_id)
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if replay is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    logger.info(
        "replay_generated",
        extra={
            "session_id": str(session_id),
            "frame_count": len(replay.frames),
            "chapter_count": len(replay.chapters),
        },
    )
    return ReplayRead.from_replay(replay)
