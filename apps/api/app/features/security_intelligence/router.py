"""
Security Intelligence API Router.

Endpoints:
  GET  /api/projects/{project_id}/security          — Retrieve security intelligence model
  POST /api/projects/{project_id}/security/refresh  — Force reprojection from PostgreSQL
  GET  /api/projects/{project_id}/security/incidents— Get active correlated security incidents
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.projects.models import Project
from app.features.security_intelligence.schemas import (
    CorrelatedSecurityIncident,
    SecurityIntelligenceRead,
)
from app.features.security_intelligence.service import (
    get_or_create_security_intelligence,
    refresh_security_intelligence,
)

router = APIRouter(prefix="/api/projects/{project_id}/security", tags=["security_intelligence"])


@router.get("", response_model=SecurityIntelligenceRead)
async def get_project_security_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SecurityIntelligenceRead:
    """Retrieve the Security Intelligence 2.0 model for a specific project."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return await get_or_create_security_intelligence(db, project_id)


@router.post("/refresh", response_model=SecurityIntelligenceRead)
async def refresh_project_security_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SecurityIntelligenceRead:
    """Force re-projection of Security Intelligence from PostgreSQL historical events & analyses."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return await refresh_security_intelligence(db, project_id)


@router.get("/incidents", response_model=list[CorrelatedSecurityIncident])
async def get_project_security_incidents_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[CorrelatedSecurityIncident]:
    """Retrieve correlated security incidents for a specific project."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    sec_model = await get_or_create_security_intelligence(db, project_id)
    return sec_model.correlated_incidents
