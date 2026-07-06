"""
Session Health router.

REST:
  GET /sessions/{session_id}/health — the session's Health Report

Mounted under the `/sessions` path — mirrors replay's precedent of a
computed sub-resource, not an independently stored one. See
docs/adr/0009-health-engine.md.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ConflictError
from app.core.logging import get_logger
from app.features.session_health import service
from app.features.session_health.schemas import HealthReportRead

router = APIRouter(tags=["session_health"])
logger = get_logger(__name__)


@router.get(
    "/sessions/{session_id}/health",
    response_model=HealthReportRead,
    summary="Get the Health Report for a session",
)
async def get_session_health(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> HealthReportRead:
    try:
        health = await service.get_health(db, session_id)
    except ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if health is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    logger.info(
        "health_generated",
        extra={"session_id": str(session_id), "metric_count": len(health.metrics)},
    )
    return HealthReportRead.from_report(health)
