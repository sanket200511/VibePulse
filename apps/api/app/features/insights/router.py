"""
Insights router.

REST:
  GET /sessions/{session_id}/profile  — full SessionProfile, grouped by category
  GET /sessions/{session_id}/insights — flattened list of DeveloperInsights

Registered under the `insights` feature module but mounted under the
`/sessions` path — mirrors timeline's precedent of a computed sub-resource,
not an independently stored one. See docs/adr/0007-developer-intelligence-engine.md.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.insights import service
from app.features.insights.schemas import SessionInsightsRead, SessionProfileRead

router = APIRouter(tags=["insights"])
logger = get_logger(__name__)


@router.get(
    "/sessions/{session_id}/profile",
    response_model=SessionProfileRead,
    summary="Get the Developer Intelligence profile for a session",
)
async def get_session_profile(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SessionProfileRead:
    profile = await service.get_profile(db, session_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    logger.info(
        "session_profile_generated",
        extra={"session_id": str(session_id), "category_count": len(profile.categories)},
    )
    return SessionProfileRead.from_profile(profile)


@router.get(
    "/sessions/{session_id}/insights",
    response_model=SessionInsightsRead,
    summary="Get a flattened list of Developer Insights for a session",
)
async def get_session_insights(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SessionInsightsRead:
    profile = await service.get_profile(db, session_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    return SessionInsightsRead.from_profile(profile)
