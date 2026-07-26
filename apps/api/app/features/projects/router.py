import uuid

from app.core.database import get_db
from app.features.projects.models import Project
from app.features.projects.schemas import ProjectListRead, ProjectRead
from app.features.sessions.constants import SessionStatus
from app.features.sessions.models import Session
from app.features.sessions.schemas import SessionListRead, SessionRead
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
    project_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> SessionListRead:
    """List sessions for a specific project."""
    # Verify project exists
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # The sweep_loop might not have swept all recently, so we pass effective_status in schemas
    result = await db.execute(
        select(Session).where(Session.project_id == project_id).order_by(Session.started_at.desc())
    )
    sessions = result.scalars().all()

    # We must use from_session to correctly populate effective_status based on the model
    # Wait, SessionStatus shouldn't be blindly cast, let's just parse it.
    out_sessions = []
    for s in sessions:
        # Simplistic effective status calculation (matching Session service if needed)
        effective_status = SessionStatus(s.status)
        out_sessions.append(SessionRead.from_session(s, effective_status=effective_status))

    return SessionListRead(sessions=out_sessions)
