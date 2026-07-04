"""
Analysis router.

REST:
  GET /events/{event_id}/analysis  — fetch all analysis results for one event
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.analysis.models import EventAnalysis
from app.features.analysis.schemas import EventAnalysisListRead, EventAnalysisRead

router = APIRouter(tags=["analysis"])
logger = get_logger(__name__)


@router.get(
    "/events/{event_id}/analysis",
    response_model=EventAnalysisListRead,
    summary="Get analysis results for a development event",
)
async def get_event_analysis(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> EventAnalysisListRead:
    """
    Return all persisted analysis findings for the requested event.

    404 is returned only when the event itself does not exist.
    An empty ``analyses`` list is returned when the event exists but the
    pipeline has not yet run (or produced no persisted findings).

    The event existence check uses raw SQL to avoid importing the
    DevelopmentEvent ORM model from the sibling events feature (ADR 0002).
    """
    # Check that the parent event exists using raw SQL (ADR 0002 compliance).
    exists_result = await db.execute(
        text("SELECT 1 FROM development_events WHERE id = :event_id LIMIT 1"),
        {"event_id": str(event_id)},
    )
    if exists_result.first() is None:
        raise HTTPException(
            status_code=404,
            detail=f"Event {event_id} not found.",
        )

    rows = await db.execute(
        select(EventAnalysis)
        .where(EventAnalysis.event_id == event_id)
        .order_by(EventAnalysis.created_at)
    )
    analyses = [EventAnalysisRead.model_validate(row) for row in rows.scalars().all()]

    logger.info(
        "analysis_fetched",
        extra={"event_id": str(event_id), "count": len(analyses)},
    )

    return EventAnalysisListRead(event_id=event_id, analyses=analyses)
