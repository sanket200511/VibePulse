"""
Predictive Engineering Intelligence REST Router.

Exposes endpoints for evidence-backed forecasts, hotspots, historical trends,
and prediction drill-down details.
"""

import uuid

from app.core.database import get_db
from app.features.predictive_intelligence.schemas import (
    HotspotItem,
    PredictiveSignal,
    PredictiveSummary,
    PredictiveTrendPoint,
)
from app.features.predictive_intelligence.service import (
    get_hotspots,
    get_or_create_predictive_intelligence,
    get_prediction_by_id,
    get_predictive_trends,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/projects/{project_id}/predictions", tags=["predictive_intelligence"]
)


@router.get("", response_model=PredictiveSummary)
@router.get("/summary", response_model=PredictiveSummary)
async def get_predictions_summary_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PredictiveSummary:
    """Retrieve complete predictive engineering summary and forecasts."""
    try:
        return await get_or_create_predictive_intelligence(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/hotspots", response_model=list[HotspotItem])
async def get_hotspots_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[HotspotItem]:
    """Retrieve ranked engineering hotspots for project."""
    try:
        return await get_hotspots(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/trends", response_model=list[PredictiveTrendPoint])
async def get_predictive_trends_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[PredictiveTrendPoint]:
    """Retrieve historical development and security trend points."""
    try:
        return await get_predictive_trends(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/refresh", response_model=PredictiveSummary)
async def refresh_predictions_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PredictiveSummary:
    """Force refresh and recompute deterministic predictive projections."""
    try:
        return await get_or_create_predictive_intelligence(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/{prediction_id}", response_model=PredictiveSignal)
async def get_prediction_detail_endpoint(
    project_id: uuid.UUID,
    prediction_id: str,
    db: AsyncSession = Depends(get_db),
) -> PredictiveSignal:
    """Retrieve full evidence details for a specific forecast signal."""
    try:
        signal = await get_prediction_by_id(db, project_id, prediction_id)
        if not signal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prediction '{prediction_id}' not found.",
            )
        return signal
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
