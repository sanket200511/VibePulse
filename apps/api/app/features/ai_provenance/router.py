"""
AI Provenance REST endpoints.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.ai_provenance.schemas import AIProvenanceResponse
from app.features.ai_provenance.service import (
    get_project_ai_provenance,
    get_session_ai_provenance,
)

router = APIRouter(tags=["ai_provenance"])


@router.get(
    "/api/sessions/{session_id}/ai-provenance",
    response_model=AIProvenanceResponse,
    summary="Get AI Provenance for a Session",
)
@router.get(
    "/sessions/{session_id}/ai-provenance",
    response_model=AIProvenanceResponse,
    summary="Get AI Provenance for a Session (legacy alias)",
    include_in_schema=False,
)
async def read_session_ai_provenance(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> AIProvenanceResponse:
    """
    Fetch the deterministic AI provenance timeline for a specific session.
    """
    provenance = await get_session_ai_provenance(db, session_id)
    if provenance is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return provenance


@router.get(
    "/api/projects/{project_id}/ai-provenance",
    response_model=AIProvenanceResponse,
    summary="Get AI Provenance for a Project",
)
@router.get(
    "/projects/{project_id}/ai-provenance",
    response_model=AIProvenanceResponse,
    summary="Get AI Provenance for a Project (legacy alias)",
    include_in_schema=False,
)
async def read_project_ai_provenance(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> AIProvenanceResponse:
    """
    Fetch the deterministic AI provenance timeline across all sessions for a project.
    """
    provenance = await get_project_ai_provenance(db, project_id)
    if provenance is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return provenance
