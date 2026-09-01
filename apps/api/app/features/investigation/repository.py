"""
Investigation Repository.
Responsible for building dynamic queries against deterministic data.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.investigation.domain import ParsedInvestigationQuery
from app.features.sessions.models import Session


async def execute_investigation_query(
    db: AsyncSession,
    query: ParsedInvestigationQuery,
    project_id: uuid.UUID | None = None,
    session_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[Sequence[DevelopmentEvent], int]:
    """
    Executes a parsed investigation query and returns the matching events.
    Includes count for pagination.
    """
    stmt = select(DevelopmentEvent)

    # 1. Base Scopes
    if project_id:
        from app.features.projects.models import Project

        project = await db.get(Project, project_id)
        if project:
            norm_root = project.root_path.replace("\\", "/")
            subq_sessions = select(Session.id).where(Session.project_id == project_id)
            stmt = stmt.where(
                or_(
                    DevelopmentEvent.project_root == project.root_path,
                    DevelopmentEvent.project_root == norm_root,
                    func.lower(func.replace(DevelopmentEvent.project_root, "\\", "/"))
                    == norm_root.lower(),
                    DevelopmentEvent.session_id.in_(subq_sessions),
                )
            )
        else:
            stmt = stmt.where(DevelopmentEvent.id.is_(None))

    if session_id:
        stmt = stmt.where(DevelopmentEvent.session_id == session_id)

    # 2. Apply Filters
    for filter_op in query.filters:
        key = filter_op.key
        val = filter_op.value

        if key == "file":
            stmt = stmt.where(DevelopmentEvent.file_path.ilike(f"%{val}%"))
        elif key == "language":
            stmt = stmt.where(DevelopmentEvent.language.ilike(val))
        elif key == "event":
            stmt = stmt.where(DevelopmentEvent.event_type == val.upper())
        elif key == "ai.provider":
            # Cast JSONB to string to check for exact value
            stmt = stmt.where(
                cast(DevelopmentEvent.event_metadata["provider"], String) == f'"{val}"'
            )
        elif key == "ai.model":
            stmt = stmt.where(cast(DevelopmentEvent.event_metadata["model"], String) == f'"{val}"')
        elif key == "severity":
            # Event has a security analysis with this severity
            subq = (
                select(EventAnalysis.event_id)
                .where(EventAnalysis.analyzer_name == "security_guardian")
                .where(
                    # PostgreSQL JSONB path operator or ilike on cast.
                    # A robust way is casting the whole findings dict to text and searching
                    cast(EventAnalysis.findings, String).ilike(f"%{val}%")
                )
            )
            stmt = stmt.where(DevelopmentEvent.id.in_(subq))
        elif key == "architecture":
            subq = (
                select(EventAnalysis.event_id)
                .where(EventAnalysis.analyzer_name == "code_evolution")
                .where(cast(EventAnalysis.findings, String).ilike(f"%{val}%"))
            )
            stmt = stmt.where(DevelopmentEvent.id.in_(subq))
        elif key == "after":
            try:
                # Assuming standard ISO format parsing
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                stmt = stmt.where(DevelopmentEvent.timestamp >= dt)
            except ValueError:
                pass
        elif key == "before":
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                stmt = stmt.where(DevelopmentEvent.timestamp <= dt)
            except ValueError:
                pass
        elif key == "session":
            # For simplicity, if val is UUID:
            try:
                stmt = stmt.where(DevelopmentEvent.session_id == uuid.UUID(val))
            except ValueError:
                pass

    # 3. Apply Full-Text Search (Hybrid)
    if query.full_text_terms:
        term_conditions = []
        for term in query.full_text_terms:
            like_term = f"%{term}%"
            # Deterministic matching against indexed or relevant string fields
            condition = or_(
                DevelopmentEvent.file_path.ilike(like_term),
                DevelopmentEvent.file_name.ilike(like_term),
                DevelopmentEvent.event_type.ilike(like_term),
                cast(DevelopmentEvent.event_metadata, String).ilike(like_term),
                # Match analysis findings for this event
                DevelopmentEvent.id.in_(
                    select(EventAnalysis.event_id).where(
                        cast(EventAnalysis.findings, String).ilike(like_term)
                    )
                ),
            )
            term_conditions.append(condition)

        # Combine all term conditions (AND logic for terms)
        stmt = stmt.where(and_(*term_conditions))

    # Calculate total count before limit/offset
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = await db.scalar(count_stmt) or 0

    # 4. Pagination & Ordering (Newest incidents first)
    stmt = stmt.order_by(DevelopmentEvent.timestamp.desc())
    stmt = stmt.limit(limit).offset(offset)

    # Return matching events
    result = await db.execute(stmt)
    events = result.scalars().all()

    return events, total_count
