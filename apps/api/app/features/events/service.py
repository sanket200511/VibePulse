"""
Event domain service.

Owns the only writes/reads against DevelopmentEvent. Routers never touch
the ORM or session directly — they call into this service.
"""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.domain.events import AnalyzableEvent
from app.core.logging import get_logger
from app.features.events.models import DevelopmentEvent
from app.features.events.schemas import DevelopmentEventCreate, DevelopmentEventRead

logger = get_logger(__name__)

DEFAULT_RECENT_LIMIT = 50


async def create_event(
    db: AsyncSession, payload: DevelopmentEventCreate
) -> tuple[DevelopmentEventRead, bool]:
    """
    Persists a development event.

    Returns (event, was_created). If the event is a duplicate observation
    (same session/file/type/timestamp — e.g. an editor's temp-file rename
    double-firing the watcher), the existing row is returned instead of
    raising, since a duplicate save is not a client error.
    """
    event = DevelopmentEvent(
        schema_version=payload.schema_version,
        event_type=payload.event_type.value,
        timestamp=payload.timestamp,
        session_id=payload.session_id,
        project_root=payload.project_root,
        file_path=payload.file_path,
        file_name=payload.file_name,
        file_extension=payload.file_extension,
        language=payload.language,
        git_branch=payload.git_branch,
        event_metadata=payload.metadata,
    )

    db.add(event)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.info(
            "duplicate_event_ignored",
            extra={
                "session_id": str(payload.session_id),
                "file_path": payload.file_path,
                "event_type": payload.event_type.value,
            },
        )
        existing = await _get_duplicate(db, payload)
        if existing is None:
            raise  # unexpected: constraint fired but row not found
        return DevelopmentEventRead.from_orm_event(existing), False

    await db.refresh(event)
    return DevelopmentEventRead.from_orm_event(event), True


async def _get_duplicate(
    db: AsyncSession, payload: DevelopmentEventCreate
) -> DevelopmentEvent | None:
    stmt = select(DevelopmentEvent).where(
        DevelopmentEvent.session_id == payload.session_id,
        DevelopmentEvent.file_path == payload.file_path,
        DevelopmentEvent.event_type == payload.event_type.value,
        DevelopmentEvent.timestamp == payload.timestamp,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_recent_events(
    db: AsyncSession, limit: int = DEFAULT_RECENT_LIMIT
) -> list[DevelopmentEventRead]:
    stmt = select(DevelopmentEvent).order_by(DevelopmentEvent.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    events = result.scalars().all()
    return [DevelopmentEventRead.from_orm_event(event) for event in events]


def to_analyzable_event(event_read: DevelopmentEventRead) -> AnalyzableEvent:
    """
    Convert a ``DevelopmentEventRead`` schema into the cross-feature-safe
    ``AnalyzableEvent`` domain object.

    This is the only place that bridges the events feature and the analysis
    pipeline.  By converting here (in the events service) and passing a plain
    dataclass, the analysis feature never needs to import events types.
    """
    return AnalyzableEvent(
        id=event_read.id,
        event_type=event_read.event_type,
        timestamp=event_read.timestamp,
        session_id=event_read.session_id,
        project_root=event_read.project_root,
        file_path=event_read.file_path,
        file_name=event_read.file_name,
        file_extension=event_read.file_extension,
        language=event_read.language,
        git_branch=event_read.git_branch,
        metadata=event_read.metadata,
    )
