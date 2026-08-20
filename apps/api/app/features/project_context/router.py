import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.project_context.export import generate_project_context_markdown
from app.features.project_context.schemas import ProjectContextRead
from app.features.project_context.service import (
    get_or_create_project_context,
    refresh_project_context,
)
from app.features.projects.models import Project

logger = get_logger(__name__)

router = APIRouter(prefix="/api/projects", tags=["project-context"])


@router.get("/{project_id}/context", response_model=ProjectContextRead)
async def get_project_context_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectContextRead:
    """
    Fetch durable Project Context Memory for a specific project.
    Aggregates languages, frameworks, development patterns, important files,
    and security history directly from stored PostgreSQL evidence.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    try:
        return await get_or_create_project_context(db, project_id)
    except Exception as err:
        logger.exception("get_context_failed", exc_info=err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve project context: {err}",
        ) from err


@router.post("/{project_id}/context/refresh", response_model=ProjectContextRead)
async def refresh_project_context_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectContextRead:
    """
    Deterministically recomputes and persists fresh Project Context derived
    from accumulated historical telemetry.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    try:
        return await refresh_project_context(db, project_id)
    except Exception as err:
        logger.exception("refresh_context_failed", exc_info=err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh project context: {err}",
        ) from err


@router.get("/{project_id}/context/export")
async def export_project_context_endpoint(
    project_id: uuid.UUID,
    format: str = Query(default="markdown", description="Export format (currently markdown)"),
    refresh: bool = Query(default=True, description="Whether to re-aggregate before export"),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Generates a portable, AI-ready PROJECT_CONTEXT.md document for the project.
    Contains verified project identity, technology stack, directory layout,
    architecture summary, security posture (redacted), and AI handoff guidance.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    if format.lower() != "markdown":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{format}'. Only 'markdown' is currently supported.",
        )

    try:
        if refresh:
            await refresh_project_context(db, project_id)

        md_content = await generate_project_context_markdown(db, project_id)

        headers = {
            "Content-Disposition": 'attachment; filename="PROJECT_CONTEXT.md"',
            "Cache-Control": "no-cache",
        }

        return Response(
            content=md_content,
            media_type="text/markdown; charset=utf-8",
            headers=headers,
        )
    except Exception as err:
        logger.exception("export_context_failed", exc_info=err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate project context export: {err}",
        ) from err
