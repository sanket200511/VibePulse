"""
Investigation Engine 3.0 REST Router.

Exposes endpoints for:
- Hybrid full-text & faceted search
- Detailed unified incident investigation reconstruction
- Incident review workflow transitions & resolution notes
- Secret-safe Markdown & AI Handoff exports
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.investigation.schemas import (
    IncidentReviewRecord,
    IncidentReviewRequest,
    InvestigationIncidentDetail,
    InvestigationResponse,
)
from app.features.investigation.service import (
    export_investigation_ai_handoff,
    export_investigation_markdown,
    reconstruct_incident_investigation,
    search_investigation,
    update_incident_review_status,
)
from app.features.projects.models import Project

router = APIRouter(tags=["investigation"])


# ── SEARCH ENDPOINTS ─────────────────────────────────────────────────────────


@router.get("/investigation/search", response_model=InvestigationResponse)
@router.get("/api/investigation/search", response_model=InvestigationResponse)
async def global_investigation_search(
    q: str = Query("", description="Hybrid search query with filters and full-text terms"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationResponse:
    """Search all events across all projects."""
    return await search_investigation(db=db, query_string=q, limit=limit, offset=offset)


@router.get(
    "/projects/{project_id}/investigation/search",
    response_model=InvestigationResponse,
)
@router.get(
    "/api/projects/{project_id}/investigation/search",
    response_model=InvestigationResponse,
)
async def project_investigation_search(
    project_id: uuid.UUID,
    q: str = Query("", description="Hybrid search query with filters and full-text terms"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationResponse:
    """Search events constrained to a specific project."""
    return await search_investigation(
        db=db,
        query_string=q,
        project_id=project_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/sessions/{session_id}/investigation/search",
    response_model=InvestigationResponse,
)
@router.get(
    "/api/sessions/{session_id}/investigation/search",
    response_model=InvestigationResponse,
)
async def session_investigation_search(
    session_id: uuid.UUID,
    q: str = Query("", description="Hybrid search query with filters and full-text terms"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationResponse:
    """Search events constrained to a specific session."""
    return await search_investigation(
        db=db,
        query_string=q,
        session_id=session_id,
        limit=limit,
        offset=offset,
    )


# ── UNIFIED INCIDENT INVESTIGATION 3.0 ENDPOINTS ─────────────────────────────


@router.get(
    "/api/projects/{project_id}/investigations/{incident_id}",
    response_model=InvestigationIncidentDetail,
)
@router.get(
    "/projects/{project_id}/investigations/{incident_id}",
    response_model=InvestigationIncidentDetail,
)
async def get_incident_investigation(
    project_id: uuid.UUID,
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> InvestigationIncidentDetail:
    """
    Reconstructs the full unified investigation for a specific development incident.
    Combines telemetry, Project Context, Engineering DNA, and Security Intelligence.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found",
        )

    try:
        return await reconstruct_incident_investigation(db, project_id, incident_id)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reconstruct incident investigation: {err}",
        ) from err


@router.post(
    "/api/projects/{project_id}/investigations/{incident_id}/review",
    response_model=IncidentReviewRecord,
)
@router.post(
    "/projects/{project_id}/investigations/{incident_id}/review",
    response_model=IncidentReviewRecord,
)
async def update_incident_review(
    project_id: uuid.UUID,
    incident_id: str,
    req: IncidentReviewRequest,
    db: AsyncSession = Depends(get_db),
) -> IncidentReviewRecord:
    """
    Updates the user review lifecycle status (OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED)
    and saves resolution notes into persistent storage.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found",
        )

    valid_statuses = ("OPEN", "INVESTIGATING", "REVIEWED", "RESOLVED")
    if req.status.upper() not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{req.status}'. Must be one of: {', '.join(valid_statuses)}",
        )

    try:
        return await update_incident_review_status(db, project_id, incident_id, req)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update incident review status: {err}",
        ) from err


@router.get("/api/projects/{project_id}/investigations/{incident_id}/export")
@router.get("/projects/{project_id}/investigations/{incident_id}/export")
async def export_incident_investigation(
    project_id: uuid.UUID,
    incident_id: str,
    format: str = Query("markdown", description="Export format: markdown or json"),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Exports a complete, secret-safe Investigation Report in Markdown or JSON.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found",
        )

    detail = await reconstruct_incident_investigation(db, project_id, incident_id)

    if format.lower() == "json":
        return Response(
            content=detail.model_dump_json(indent=2),
            media_type="application/json; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="investigation-{incident_id}.json"'
            },
        )

    md_content = export_investigation_markdown(detail)
    return Response(
        content=md_content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="investigation-{incident_id}.md"'},
    )


@router.get("/api/projects/{project_id}/investigations/{incident_id}/ai-handoff")
@router.get("/projects/{project_id}/investigations/{incident_id}/ai-handoff")
async def export_incident_ai_handoff(
    project_id: uuid.UUID,
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Generates structured AI handoff document with OBSERVED, INFERRED, UNKNOWN.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found",
        )

    detail = await reconstruct_incident_investigation(db, project_id, incident_id)
    md_content = export_investigation_ai_handoff(detail)

    return Response(
        content=md_content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="AI_HANDOFF_INVESTIGATION_{incident_id}.md"'
            )
        },
    )
