import uuid
from datetime import UTC, datetime

from app.core.database import get_db
from app.features.architecture_timeline.schemas import ProjectArchitectureTimelineRead
from app.features.projects.models import Project
from app.features.projects.schemas import (
    ProjectCreate,
    ProjectDeleteResponse,
    ProjectIntelligenceRead,
    ProjectListRead,
    ProjectRead,
)
from app.features.projects.service import (
    ProjectActiveError,
    delete_project,
    get_or_create_project,
)
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
    return ProjectListRead(projects=[ProjectRead.model_validate(p) for p in projects])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_200_OK)
@router.post("/ensure", response_model=ProjectRead, status_code=status.HTTP_200_OK)
async def ensure_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    """Ensure a project exists by root path (idempotent registration)."""
    if not payload.root_path or not payload.root_path.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="root_path must not be empty",
        )
    project = await get_or_create_project(
        db,
        root_path=payload.root_path.strip(),
        display_name=payload.display_name,
    )
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ProjectRead:
    """Get a project by ID."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectRead.model_validate(project)


@router.delete(
    "/{project_id}",
    response_model=ProjectDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_project_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectDeleteResponse:
    """
    Safely delete a project's observation telemetry, sessions, analyses,
    investigations, and context memory from PostgreSQL without touching the filesystem.
    """
    try:
        result = await delete_project(db, project_id)
    except ProjectActiveError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "PROJECT_ACTIVE",
                "message": (
                    "This project is currently being observed. "
                    "Stop observation before deleting it."
                ),
                "project_name": exc.project_name,
                "project_root": exc.project_root,
                "reason": "Active observation session in progress",
            },
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return ProjectDeleteResponse(**result)


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


@router.get("/{project_id}/intelligence", response_model=ProjectIntelligenceRead)
async def get_project_intelligence_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectIntelligenceRead:
    """Get longitudinal intelligence for a specific project."""
    from app.features.projects.service import get_project_intelligence

    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result_dict = await get_project_intelligence(db, project_id)
    return ProjectIntelligenceRead(**result_dict)


@router.get("/{project_id}/architecture", response_model=ProjectArchitectureTimelineRead)
async def get_project_architecture_endpoint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectArchitectureTimelineRead:
    """Get the architecture timeline for a specific project."""
    from app.features.architecture_timeline.service import get_project_architecture_timeline

    timeline = await get_project_architecture_timeline(db, project_id)
    if timeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return ProjectArchitectureTimelineRead.from_timeline(
        project_id, datetime.now(tz=UTC), timeline
    )
