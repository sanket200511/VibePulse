import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.analysis.models import EventAnalysis
from app.features.engineering_dna.domain import build_engineering_dna
from app.features.engineering_dna.schemas import EngineeringDNARead
from app.features.events.models import DevelopmentEvent
from app.features.events.schemas import DevelopmentEventRead
from app.features.events.service import to_analyzable_event
from app.features.projects.models import Project


async def get_engineering_dna(
    db: AsyncSession, project_id: uuid.UUID, file_path: str
) -> EngineeringDNARead | None:
    # Get project root
    stmt_proj = select(Project).where(Project.id == project_id)
    proj_result = await db.execute(stmt_proj)
    project = proj_result.scalar_one_or_none()
    if not project:
        return None

    # Get all events for this file in this project
    stmt_events = (
        select(DevelopmentEvent)
        .where(
            DevelopmentEvent.project_root == project.root_path,
            DevelopmentEvent.file_path == file_path,
        )
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    events_result = await db.execute(stmt_events)
    events_orm = events_result.scalars().all()

    if not events_orm:
        return None

    event_reads = [DevelopmentEventRead.from_orm_event(e) for e in events_orm]
    analyzable_events = [to_analyzable_event(e) for e in event_reads]
    event_ids = [e.id for e in analyzable_events]

    # Get all analyses for these events
    # We chunk if there are too many, but typically ok for one file
    # We'll just fetch all analyses where event_id in event_ids
    stmt_analyses = select(EventAnalysis).where(EventAnalysis.event_id.in_(event_ids))
    analyses_result = await db.execute(stmt_analyses)
    analyses_orm = analyses_result.scalars().all()

    # Build analyses dictionary: { event_id: { analyzer_name: findings } }
    analyses_dict = {}
    for a in analyses_orm:
        if a.event_id not in analyses_dict:
            analyses_dict[a.event_id] = {}
        analyses_dict[a.event_id][a.analyzer_name] = a.findings

    return build_engineering_dna(file_path, analyzable_events, analyses_dict)
