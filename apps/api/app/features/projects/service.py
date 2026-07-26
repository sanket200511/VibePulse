import uuid

from app.features.projects.models import Project
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_create_project(db: AsyncSession, root_path: str) -> Project:
    """
    Ensure a canonical Project exists for a given filesystem root.
    Uses basic path normalization to prevent trivial duplicate identities.
    """
    normalized_path = root_path.rstrip("/\\")

    # Check if exists
    result = await db.execute(select(Project).where(Project.root_path == normalized_path))
    project = result.scalar_one_or_none()

    if project:
        return project

    # Derive display name from basename
    parts = normalized_path.replace("\\", "/").split("/")
    display_name = parts[-1] if parts else "Unknown Project"

    # Create new
    project = Project(
        id=uuid.uuid4(),
        root_path=normalized_path,
        display_name=display_name,
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

    total_sessions = metrics_result.total_sessions or 0
    total_events = int(metrics_result.total_events)
    first_observed = metrics_result.first_observed_at
    latest_observed = metrics_result.latest_observed_at

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
        return {row.key: row.count for row in res}

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
