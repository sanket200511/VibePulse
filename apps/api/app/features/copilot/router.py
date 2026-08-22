"""
AI Engineering Copilot REST Router.

Exposes endpoints for:
- Executing natural engineering queries: POST /api/projects/{project_id}/copilot/query
- Retrieving complete AI evidence context: GET /api/projects/{project_id}/copilot/context
- Retrieving state-driven question suggestions: GET /api/projects/{project_id}/copilot/suggestions
"""

from __future__ import annotations

import uuid

from app.core.database import get_db
from app.features.copilot import service
from app.features.copilot.schemas import (
    CopilotEvidenceContext,
    CopilotQueryRequest,
    CopilotResponse,
    CopilotSuggestion,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/projects/{project_id}/copilot",
    tags=["engineering-copilot"],
)


@router.post(
    "/query",
    response_model=CopilotResponse,
    summary="Query AI Engineering Copilot",
)
async def query_copilot_endpoint(
    project_id: uuid.UUID,
    payload: CopilotQueryRequest,
    db: AsyncSession = Depends(get_db),
) -> CopilotResponse:
    """
    Execute a natural engineering query against canonical intelligence.
    Produces a deterministic, evidence-grounded response with explicit provenance.
    """
    try:
        return await service.query_copilot(
            db,
            project_id,
            payload.query,
            include_raw_context=payload.include_raw_context,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot query failed: {e}") from e


@router.get(
    "/context",
    response_model=CopilotEvidenceContext,
    summary="Get AI Copilot Evidence Context",
)
async def get_copilot_context_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> CopilotEvidenceContext:
    """
    Retrieve the complete AI-ready Copilot evidence package for a project.
    Contains grounded facts, unknowns, entities, and risk posture.
    """
    try:
        return await service.get_copilot_context(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch copilot context: {e}") from e


@router.get(
    "/suggestions",
    response_model=list[CopilotSuggestion],
    summary="Get dynamic question suggestions",
)
async def get_copilot_suggestions_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[CopilotSuggestion]:
    """
    Retrieve dynamic, state-driven suggested questions based on current project telemetry.
    """
    try:
        return await service.get_copilot_suggestions(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch suggestions: {e}") from e
