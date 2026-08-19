"""
Investigation Service.
Coordinates the AST parsing, repository execution, and canonical mapping.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.investigation.domain import parse_investigation_query
from app.features.investigation.repository import execute_investigation_query
from app.features.investigation.schemas import (
    InvestigationAIEvent,
    InvestigationArchitectureChange,
    InvestigationResponse,
    InvestigationResult,
    InvestigationSecurityFinding,
)
from app.features.timeline.service import _fetch_analyses


async def search_investigation(
    db: AsyncSession,
    query_string: str,
    project_id: uuid.UUID | None = None,
    session_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> InvestigationResponse:
    # 1. Parse AST
    query = parse_investigation_query(query_string)

    # 2. Fetch Raw Deterministic Data
    events, total_count = await execute_investigation_query(
        db, query, project_id, session_id, limit, offset
    )

    if not events:
        return InvestigationResponse(results=[], total_count=0, has_more=False)

    # 3. Fetch Analyses for the matched events
    event_ids = [e.id for e in events]
    analyses = await _fetch_analyses(db, event_ids)

    # 4. Map to Canonical Result
    results: list[InvestigationResult] = []

    for i, event in enumerate(events):
        event_analyses = analyses.get(event.id, {})

        # Populate derived schemas
        architecture_changes = []
        evo = event_analyses.get("code_evolution", {})
        for obs in evo.get("observations", []):
            architecture_changes.append(
                InvestigationArchitectureChange(
                    kind=obs.get("kind", ""),
                    symbol=obs.get("symbol", ""),
                )
            )

        security_findings = []
        sec = event_analyses.get("security_guardian", {})
        for finding in sec.get("findings", []):
            msg = finding.get("title") or finding.get("message") or finding.get("description") or ""
            security_findings.append(
                InvestigationSecurityFinding(
                    rule_id=finding.get("rule_id", ""),
                    severity=finding.get("severity", ""),
                    message=msg,
                )
            )

        ai_event = None
        if event.event_type in (
            "AI_REQUEST_STARTED",
            "AI_RESPONSE_RECEIVED",
            "AI_TOOL_EXECUTED",
            "AI_COMPLETION_ACCEPTED",
        ):
            ai_event = InvestigationAIEvent(
                provider=event.event_metadata.get("provider", "Unknown"),
                model=event.event_metadata.get("model", "Unknown"),
                interaction_type=event.event_metadata.get("interaction_type"),
            )

        summary = f"{event.event_type.replace('_', ' ').title()}"
        if event.file_name:
            summary += f" on {event.file_name}"

        results.append(
            InvestigationResult(
                id=event.id,
                timestamp=event.timestamp,
                project_root=event.project_root,
                session_id=event.session_id,
                file_path=event.file_path,
                language=event.language,
                event_type=event.event_type,
                summary=summary,
                architecture_changes=architecture_changes,
                security_findings=security_findings,
                ai_event=ai_event,
                replay_link=f"/sessions/{event.session_id}/replay?event={event.id}",
                timeline_position=i + offset,
            )
        )

    has_more = (offset + limit) < total_count

    return InvestigationResponse(
        results=results,
        total_count=total_count,
        has_more=has_more,
    )
