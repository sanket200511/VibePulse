"""
Evidence & Explainability REST API Router.

Provides endpoints answering "WHY DOES VIBEPULSE BELIEVE THIS?"
across health, security, incident, prediction, and priority domains.
"""

import uuid

from app.core.database import get_db
from app.features.evidence.schemas import EntityExplainabilityResponse, EntityType
from app.features.evidence.service import explain_entity
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/projects/{project_id}/evidence",
    tags=["evidence-explainability"],
)


@router.get(
    "/{entity_type}/{entity_id}",
    response_model=EntityExplainabilityResponse,
    summary="Explain why DepRadar arrived at a specific conclusion",
)
async def get_entity_explanation(
    project_id: uuid.UUID,
    entity_type: EntityType,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
) -> EntityExplainabilityResponse:
    """
    Retrieve comprehensive, causal explainability for any intelligence entity:
    - `health`: Mathematical score decomposition & 5-dimension causal chain
    - `security`: AST rule violation rationale, risk contribution, redacted evidence
    - `incident`: Evidence graph correlation, review decisions, root cause
    - `prediction`: Forecast score breakdown, evidence strength, historical signals
    - `priority`: Multi-key ranking rationale, urgency calculation, recommended action
    """
    try:
        return await explain_entity(db, project_id, entity_type, entity_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e


@router.get(
    "/{entity_type}",
    response_model=EntityExplainabilityResponse,
    summary="Explain top/current entity in domain",
)
async def get_domain_explanation(
    project_id: uuid.UUID,
    entity_type: EntityType,
    db: AsyncSession = Depends(get_db),
) -> EntityExplainabilityResponse:
    """Default handler to explain the active/primary entity for a domain."""
    try:
        return await explain_entity(db, project_id, entity_type, "current")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
