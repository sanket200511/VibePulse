import uuid
from datetime import UTC, datetime

from app.core.database import get_db
from app.features.projects.models import Project
from app.features.projects.schemas import ProjectListRead, ProjectRead
from app.features.sessions.models import Session
from app.features.sessions.schemas import SessionListRead, SessionRead
from app.features.sessions.service import compute_effective_status
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListRead)
async def list_projects(db: AsyncSession = Depends(get_db)) -> ProjectListRead:
    """List all projects."""
    result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    projects = result.scalars().all()
    return ProjectListRead(projects=list(projects))


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ProjectRead:
    """Get a project by ID."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/{project_id}/sessions", response_model=SessionListRead)
async def get_project_sessions(
    project_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> SessionListRead:
    """List sessions for a specific project."""
    # Verify project exists
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Get total count
    count_stmt = select(func.count()).select_from(Session).where(Session.project_id == project_id)
    total = await db.scalar(count_stmt) or 0

    # Get paginated sessions
    result = await db.execute(
        select(Session)
        .where(Session.project_id == project_id)
        .order_by(Session.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()

    now = datetime.now(tz=UTC)
    out_sessions = []
    for s in sessions:
        effective_status = compute_effective_status(s, now)
        out_sessions.append(SessionRead.from_session(s, effective_status=effective_status))

    has_more = (offset + limit) < total

    return SessionListRead(
        sessions=out_sessions, total=total, limit=limit, offset=offset, has_more=has_more
    )
