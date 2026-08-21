"""
Unified Project Health & Priority Orchestrator REST Router.

Exposes endpoints for the 5-dimensional health model,
and the 'What Should I Do Next?' priority engine.
"""

from __future__ import annotations

import uuid

from app.core.database import get_db
from app.features.project_health.schemas import (
    ProjectPriorityItem,
    UnifiedProjectHealth,
)
from app.features.project_health.service import (
    get_or_create_unified_project_health,
    get_project_priorities,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/projects/{project_id}/health", tags=["project_health"])


@router.get("", response_model=UnifiedProjectHealth)
async def get_project_health_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> UnifiedProjectHealth:
    """Retrieve synthesized 5-dimensional project health model and top priorities."""
    try:
        return await get_or_create_unified_project_health(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/priorities", response_model=list[ProjectPriorityItem])
async def get_project_priorities_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ProjectPriorityItem]:
    """Retrieve ranked actionable 'What Should I Do Next?' priority list."""
    try:
        return await get_project_priorities(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/refresh", response_model=UnifiedProjectHealth)
async def refresh_project_health_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> UnifiedProjectHealth:
    """Force re-aggregation and recalculation of Unified Project Health."""
    try:
        return await get_or_create_unified_project_health(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
