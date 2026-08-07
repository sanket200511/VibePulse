"""
Investigation REST Endpoints.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.investigation.schemas import InvestigationResponse
from app.features.investigation.service import search_investigation

router = APIRouter(tags=["investigation"])


@router.get("/investigation/search", response_model=InvestigationResponse)
async def global_investigation_search(
    q: str = Query("", description="Hybrid search query with filters and full-text terms"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationResponse:
    """Search all events across all projects."""
    return await search_investigation(db=db, query_string=q, limit=limit, offset=offset)


@router.get("/projects/{project_id}/investigation/search", response_model=InvestigationResponse)
async def project_investigation_search(
    project_id: uuid.UUID,
    q: str = Query("", description="Hybrid search query with filters and full-text terms"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationResponse:
    """Search events constrained to a specific project."""
    return await search_investigation(
        db=db, query_string=q, project_id=project_id, limit=limit, offset=offset
    )


@router.get("/sessions/{session_id}/investigation/search", response_model=InvestigationResponse)
async def session_investigation_search(
    session_id: uuid.UUID,
    q: str = Query("", description="Hybrid search query with filters and full-text terms"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationResponse:
    """Search events constrained to a specific session."""
    return await search_investigation(
        db=db, query_string=q, session_id=session_id, limit=limit, offset=offset
    )
