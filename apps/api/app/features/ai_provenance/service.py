"""
AI Provenance Service
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.domain.events import AnalyzableEvent
from app.features.ai_provenance.schemas import (
    AIInteractionTimelineEntry,
    AIProvenanceResponse,
    AIProvenanceStats,
    SubsequentEvent,
)
from app.features.events.constants import EventType
from app.features.events.service import to_analyzable_event
from app.features.sessions import service as session_service
from app.features.sessions.models import Session
from app.features.timeline.service import _fetch_analyses, _fetch_session_events


def _correlate_provenance(
    events: list[AnalyzableEvent],
    analyses: dict[uuid.UUID, dict[str, Any]],
) -> AIProvenanceResponse:
    timeline: list[AIInteractionTimelineEntry] = []

    stats = AIProvenanceStats()
    providers: set[str] = set()
    models: set[str] = set()

    current_ai_interaction: AIInteractionTimelineEntry | None = None

    for event in sorted(events, key=lambda e: e.timestamp):
        # Identify AI events
        if event.event_type in (
            EventType.AI_REQUEST_STARTED,
            EventType.AI_RESPONSE_RECEIVED,
            EventType.AI_TOOL_EXECUTED,
            EventType.AI_COMPLETION_ACCEPTED,
        ):
            stats.total_interactions += 1
            if event.event_type == EventType.AI_TOOL_EXECUTED:
                stats.total_tools_executed += 1

            provider = event.metadata.get("provider")
            model = event.metadata.get("model")

            if provider:
                providers.add(provider)
            if model:
                models.add(model)

            entry = AIInteractionTimelineEntry(
                event_id=event.id,
                event_type=event.event_type,
                timestamp=event.timestamp,
                provider=provider,
                model=model,
                interaction_type=event.metadata.get("interaction_type"),
                conversation_id=event.metadata.get("conversation_id"),
                request_id=event.metadata.get("request_id"),
                prompt_size_bytes=event.metadata.get("prompt_size_bytes"),
                response_size_bytes=event.metadata.get("response_size_bytes"),
                tool_count=event.metadata.get("tool_count"),
                files_modified_afterwards=[],
                architecture_events_afterwards=[],
                security_events_afterwards=[],
            )
            timeline.append(entry)
            current_ai_interaction = entry
            continue

        # If we have an active AI interaction, correlate subsequent events
        if current_ai_interaction is not None:
            # Correlation rules: Same session, same project (implied by the fetch scope).
            # If there's an active file mentioned in the AI interaction, prioritize it.
            # Here we correlate if it happens after (chronologically).

            if event.event_type in (EventType.FILE_MODIFIED, EventType.FILE_CREATED):
                path = event.file_path or event.file_name
                if path and path not in current_ai_interaction.files_modified_afterwards:
                    current_ai_interaction.files_modified_afterwards.append(path)

            # Check for architectural/security evolution in the analyses
            event_analysis = analyses.get(event.id, {})

            # Code evolution
            evo = event_analysis.get("code_evolution", {})
            for obs in evo.get("observations", []):
                current_ai_interaction.architecture_events_afterwards.append(
                    SubsequentEvent(
                        event_type="ARCHITECTURE_EVOLUTION",
                        timestamp=event.timestamp,
                        details={"kind": obs.get("kind"), "symbol": obs.get("symbol")},
                    )
                )

            # Security findings
            sec = event_analysis.get("security", {})
            for finding in sec.get("findings", []):
                current_ai_interaction.security_events_afterwards.append(
                    SubsequentEvent(
                        event_type="SECURITY_FINDING",
                        timestamp=event.timestamp,
                        details={
                            "rule_id": finding.get("rule_id"),
                            "severity": finding.get("severity"),
                            "message": finding.get("message"),
                        },
                    )
                )

    stats.providers_used = sorted(providers)
    stats.models_used = sorted(models)

    return AIProvenanceResponse(
        stats=stats,
        timeline=timeline,
    )


async def get_session_ai_provenance(
    db: AsyncSession, session_id: uuid.UUID
) -> AIProvenanceResponse | None:
    session = await session_service.get_session(db, session_id)
    if session is None:
        return None

    event_reads = await _fetch_session_events(db, session)
    events = [to_analyzable_event(event_read) for event_read in event_reads]
    analyses = await _fetch_analyses(db, [event.id for event in events])

    return _correlate_provenance(events, analyses)


async def get_project_ai_provenance(
    db: AsyncSession, project_id: uuid.UUID
) -> AIProvenanceResponse | None:
    result = await db.execute(
        select(Session).where(Session.project_id == project_id).order_by(Session.started_at.asc())
    )
    sessions = result.scalars().all()
    if not sessions:
        from app.features.projects.models import Project

        project = await db.get(Project, project_id)
        if not project:
            return None
        return AIProvenanceResponse(stats=AIProvenanceStats(), timeline=[])

    all_events = []
    for session in sessions:
        event_reads = await _fetch_session_events(db, session)
        all_events.extend([to_analyzable_event(event_read) for event_read in event_reads])

    analyses = await _fetch_analyses(db, [event.id for event in all_events])
    return _correlate_provenance(all_events, analyses)
