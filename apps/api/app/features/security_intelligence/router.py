"""
Security Intelligence API Router.

Endpoints:
  GET  /api/projects/{project_id}/security          — Retrieve security intelligence model
  POST /api/projects/{project_id}/security/refresh  — Force reprojection from PostgreSQL
  GET  /api/projects/{project_id}/security/incidents— Get active correlated security incidents
"""

from __future__ import annotations

import uuid
from typing import Any

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


@router.get("/ml-status")
async def get_project_security_ml_status_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve Secret Detection ML engine status, model metadata, and evaluation results."""
    import json
    import os

    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Check classical model
    artifact_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "ml",
        "secret_detection",
        "artifacts",
        "secret-classifier",
    )
    has_model = os.path.exists(os.path.join(artifact_dir, "model.joblib"))
    meta: dict[str, Any] = {}
    if has_model and os.path.exists(os.path.join(artifact_dir, "metadata.json")):
        try:
            with open(os.path.join(artifact_dir, "metadata.json"), encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            meta = {}

    # Check evaluation report
    eval_summary: dict[str, Any] | None = None
    root_dir = os.path.abspath(
        os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            )
        )
    )
    eval_json = os.path.join(root_dir, "reports", "secret_detection_evaluation.json")
    if os.path.exists(eval_json):
        try:
            with open(eval_json, encoding="utf-8") as f:
                eval_summary = json.load(f)
        except Exception:
            eval_summary = None

    return {
        "status": "READY" if has_model else "UNAVAILABLE",
        "ml_enabled": os.getenv("SECRET_ML_ENABLED", "true").lower() not in ("false", "0", "no"),
        "detection_strategy": "HYBRID",
        "classical_model": {
            "name": meta.get("model_name", "rf-secret-classifier"),
            "version": meta.get("model_version", "1.0.0"),
            "model_type": meta.get("model_type", "random_forest"),
            "status": "READY" if has_model else "NOT_TRAINED",
        },
        "transformer_model": {
            "name": "codebert-secret-context",
            "version": "1.0.0",
            "status": "NOT_AVAILABLE",
            "reason": (
                "Contextual transformer weights or PyTorch dependencies "
                "not loaded in lightweight environment"
            ),
        },
        "truth_boundary": {
            "OBSERVED": "Directly observed syntactic assignment or token pattern.",
            "INFERRED": "Machine learning probability distribution across secret classes.",
            "UNKNOWN": "Indeterminate state or missing model artifact.",
        },
        "evaluation_summary": eval_summary,
    }
