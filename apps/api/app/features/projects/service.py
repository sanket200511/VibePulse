import os
import pathlib
import uuid

from app.features.projects.models import Project
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


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


async def get_project_intelligence(db: AsyncSession, project_id: uuid.UUID) -> dict:
    from app.features.sessions.models import Session
    from sqlalchemy import func, text

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
