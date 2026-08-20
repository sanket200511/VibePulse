import os
import pathlib
import uuid
from typing import Any

from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.project_context.models import ProjectContext
from app.features.projects.models import Project
from app.features.sessions.constants import SessionStatus
from app.features.sessions.models import Session
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


class ProjectActiveError(Exception):
    """Raised when an operation cannot be performed because a project has active observations."""

    def __init__(self, project_name: str, project_root: str, active_sessions: int) -> None:
        self.project_name = project_name
        self.project_root = project_root
        self.active_sessions = active_sessions
        super().__init__(
            f"Project '{project_name}' has {active_sessions} active observation session(s)."
        )


def normalize_root_path(root_path: str) -> str:
    """
    Normalize a project root path consistently across platforms.
    Resolves canonical filesystem path when present, standardizes drive letters and slashes.
    """
    if not root_path or not root_path.strip():
        return ""
    clean = root_path.strip()

    # Try resolving via filesystem if path exists
    try:
        p = pathlib.Path(clean)
        if p.exists():
            return str(p.resolve())
    except OSError:
        pass

    # Pure normalization fallback
    clean = os.path.normpath(clean).rstrip("/\\")
    if len(clean) >= 2 and clean[1] == ":" and clean[0].isalpha():
        clean = clean[0].upper() + clean[1:]
    return clean


async def get_or_create_project(
    db: AsyncSession,
    root_path: str,
    display_name: str | None = None,
) -> Project:
    """
    Ensure a canonical Project exists for a given filesystem root.
    Uses path normalization and case-insensitive matching to prevent duplicate identities.
    """
    normalized_path = normalize_root_path(root_path)

    # Check if exists
    stmt = select(Project).where(
        or_(
            Project.root_path == normalized_path,
            Project.root_path == root_path,
            Project.root_path == root_path.rstrip("/\\"),
            func.lower(func.replace(Project.root_path, "\\", "/"))
            == func.lower(func.replace(normalized_path, "\\", "/")),
        )
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if project:
        return project

    # Derive display name from basename if not explicitly provided
    if not display_name or not display_name.strip():
        parts = normalized_path.replace("\\", "/").rstrip("/").split("/")
        derived = parts[-1] if parts and parts[-1] else "Unknown Project"
        display_name = derived

    # Create new
    project = Project(
        id=uuid.uuid4(),
        root_path=normalized_path,
        display_name=display_name.strip(),
    )
    db.add(project)
    await db.flush()
    return project


async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any] | None:
    """
    Safely delete a project's observation telemetry, sessions, analyses,
    investigations, and context memory from PostgreSQL in a single atomic transaction.

    Safety:
    - NEVER touches or deletes physical files/directories on the filesystem.
    - Fails with ProjectActiveError (409) if the project has an ACTIVE session.
    - Transactional: Rolls back completely on failure.
    - Returns structured counts of removed entities.
    """
    project = await db.get(Project, project_id)
    if not project:
        return None

    # Path match criteria for sessions and events
    norm_root = normalize_root_path(project.root_path)
    root_conditions = or_(
        Session.project_id == project.id,
        Session.project_root == project.root_path,
        Session.project_root == norm_root,
        func.lower(func.replace(Session.project_root, "\\", "/"))
        == func.lower(func.replace(project.root_path, "\\", "/")),
    )

    # 1. Check for Active Sessions
    active_stmt = select(func.count(Session.id)).where(
        root_conditions,
        Session.status == SessionStatus.ACTIVE.value,
    )
    active_count = (await db.execute(active_stmt)).scalar() or 0
    if active_count > 0:
        raise ProjectActiveError(
            project_name=project.display_name,
            project_root=project.root_path,
            active_sessions=active_count,
        )

    # 2. Gather session IDs for this project
    sessions_query = select(Session.id).where(root_conditions)
    session_ids = (await db.execute(sessions_query)).scalars().all()
    sessions_count = len(session_ids)

    # Find all event IDs for this project
    event_conditions = or_(
        DevelopmentEvent.project_root == project.root_path,
        DevelopmentEvent.project_root == norm_root,
        func.lower(func.replace(DevelopmentEvent.project_root, "\\", "/"))
        == func.lower(func.replace(project.root_path, "\\", "/")),
    )
    if session_ids:
        event_conditions = or_(event_conditions, DevelopmentEvent.session_id.in_(session_ids))

    events_stmt = select(DevelopmentEvent.id).where(event_conditions)
    event_ids = (await db.execute(events_stmt)).scalars().all()
    events_count = len(event_ids)

    analyses_count = 0
    if event_ids:
        analyses_stmt = select(func.count(EventAnalysis.id)).where(
            EventAnalysis.event_id.in_(event_ids)
        )
        analyses_count = (await db.execute(analyses_stmt)).scalar() or 0

    ctx_stmt = select(func.count(ProjectContext.id)).where(
        ProjectContext.project_id == project.id
    )
    context_count = (await db.execute(ctx_stmt)).scalar() or 0

    # 3. Explicit Atomic Deletion in strict dependency order
    if event_ids:
        await db.execute(delete(EventAnalysis).where(EventAnalysis.event_id.in_(event_ids)))
        await db.execute(delete(DevelopmentEvent).where(DevelopmentEvent.id.in_(event_ids)))

    await db.execute(delete(ProjectContext).where(ProjectContext.project_id == project.id))
    if session_ids:
        await db.execute(delete(Session).where(Session.id.in_(session_ids)))

    await db.execute(delete(Project).where(Project.id == project.id))

    await db.commit()

    return {
        "deleted": True,
        "project_id": project.id,
        "project_name": project.display_name,
        "deleted_counts": {
            "events": events_count,
            "sessions": sessions_count,
            "analyses": analyses_count,
            "investigations": analyses_count,
            "context": context_count,
        },
    }


async def get_project_intelligence(db: AsyncSession, project_id: uuid.UUID) -> dict:
    from sqlalchemy import text

    # Query 1: Basic metrics & observation window
    metrics_stmt = select(
        func.count(Session.id).label("total_sessions"),
        func.coalesce(func.sum(Session.event_count), 0).label("total_events"),
        func.min(Session.started_at).label("first_observed_at"),
        func.max(Session.last_event_at).label("latest_observed_at"),
    ).where(Session.project_id == project_id)

    metrics_result = (await db.execute(metrics_stmt)).first()

    if metrics_result:
        total_sessions = metrics_result.total_sessions or 0
        total_events = int(metrics_result.total_events)
        first_observed = metrics_result.first_observed_at
        latest_observed = metrics_result.latest_observed_at
    else:
        total_sessions = 0
        total_events = 0
        first_observed = None
        latest_observed = None

    # Helper function to aggregate jsonb columns
    async def aggregate_jsonb(column_name: str, limit: int | None = None) -> dict[str, int]:
        # Using raw SQL fragment via text() to safely unnest JSONB
        # Safe because column_name is statically provided
        stmt = text(f"""
            SELECT kv.key, SUM(CAST(kv.value AS INTEGER)) as count
            FROM sessions s, jsonb_each_text(s.{column_name}) kv
            WHERE s.project_id = :pid
            GROUP BY kv.key
            ORDER BY count DESC
            {f"LIMIT {limit}" if limit else ""}
        """)  # noqa: S608
        res = await db.execute(stmt, {"pid": project_id})
        return {row.key: row._mapping["count"] for row in res}

    language_activity = await aggregate_jsonb("languages")
    event_composition = await aggregate_jsonb("events_by_type")

    # Files have a limit to prevent huge payloads
    file_activity_raw = await aggregate_jsonb("files", limit=50)

    frequently_observed_files = [
        {"path": k, "event_count": v} for k, v in file_activity_raw.items()
    ]

    # Query 5: Activity series (bounded)
    series_stmt = (
        select(Session.id, Session.started_at, Session.event_count, Session.status)
        .where(Session.project_id == project_id)
        .order_by(Session.started_at.desc())
        .limit(100)
    )

    series_res = await db.execute(series_stmt)
    activity_series = [
        {
            "session_id": row.id,
            "started_at": row.started_at,
            "event_count": row.event_count,
            "status": row.status,
        }
        for row in series_res
    ]

    return {
        "project_id": project_id,
        "observation_window": {
            "first_observed_at": first_observed,
            "latest_observed_at": latest_observed,
        },
        "metrics": {
            "total_sessions": total_sessions,
            "total_events": total_events,
        },
        "activity_series": activity_series,
        "event_composition": event_composition,
        "language_activity": language_activity,
        "frequently_observed_files": frequently_observed_files,
    }
