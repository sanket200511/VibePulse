"""
Architecture Timeline domain — pure, framework-free construction of the Architecture Time Machine.

Unpacks events and their analyses into a singular, flat narrative of engineering evolution.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.core.domain.events import AnalyzableEvent


@dataclass(frozen=True)
class ArchitectureTimelineEntry:
    id: uuid.UUID
    timestamp: datetime
    kind: str
    title: str
    description: str | None
    related_file: str | None
    related_event_id: uuid.UUID | None
    analysis_reference: str | None
    severity: str | None = None


@dataclass(frozen=True)
class ArchitectureTimeline:
    entries: list[ArchitectureTimelineEntry]


def build_architecture_timeline(
    events: list[AnalyzableEvent],
    analyses: dict[uuid.UUID, dict[str, dict[str, Any]]],
    *,
    session_started_at: datetime,
    session_ended_at: datetime | None,
) -> ArchitectureTimeline:
    entries: list[ArchitectureTimelineEntry] = []

    # 1. Session Start
    entries.append(
        ArchitectureTimelineEntry(
            id=uuid.uuid4(),
            timestamp=session_started_at,
            kind="SESSION_START",
            title="Session Started",
            description="Engineering session began.",
            related_file=None,
            related_event_id=None,
            analysis_reference=None,
        )
    )

    for event in events:
        # Include AI Observations directly in the timeline
        if event.event_type in (
            "AI_REQUEST_STARTED",
            "AI_RESPONSE_RECEIVED",
            "AI_TOOL_EXECUTED",
            "AI_COMPLETION_ACCEPTED",
        ):
            provider = event.metadata.get("provider", "AI")
            model = event.metadata.get("model", "")
            desc = f"Provider: {provider} {model}".strip()

            # Use interaction type or event type as title
            interaction = event.metadata.get("interaction_type")
            if interaction:
                title = f"AI Observation: {interaction}"
            else:
                title = f"AI Observation: {event.event_type.replace('_', ' ').title()}"

            entries.append(
                ArchitectureTimelineEntry(
                    id=uuid.uuid4(),
                    timestamp=event.timestamp,
                    kind="AI_OBSERVATION",
                    title=title,
                    description=desc,
                    related_file=event.file_path,
                    related_event_id=event.id,
                    analysis_reference="ai_provenance",
                )
            )

        event_analyses = analyses.get(event.id, {})

        # Look for code evolution
        evolution = event_analyses.get("code_evolution", {})
        observations = evolution.get("observations", [])
        for obs in observations:
            kind = obs.get("kind", "UNKNOWN")
            symbol = obs.get("symbol", "")
            entries.append(
                ArchitectureTimelineEntry(
                    id=uuid.uuid4(),
                    timestamp=event.timestamp,
                    kind=kind,
                    title=f"Evolution: {kind}",
                    description=f"Observed: {symbol}",
                    related_file=event.file_path,
                    related_event_id=event.id,
                    analysis_reference="code_evolution",
                )
            )

        # Look for security findings
        security = event_analyses.get("security_guardian", {})
        findings = security.get("findings", [])
        for f in findings:
            title = f.get("title", "Security Finding")
            severity = f.get("severity", "LOW")
            entries.append(
                ArchitectureTimelineEntry(
                    id=uuid.uuid4(),
                    timestamp=event.timestamp,
                    kind="SECURITY_FINDING",
                    title=title,
                    description=f.get("evidence", ""),
                    related_file=f.get("file") or event.file_path,
                    related_event_id=event.id,
                    analysis_reference="security_guardian",
                    severity=severity,
                )
            )

    # 2. Session End
    if session_ended_at:
        entries.append(
            ArchitectureTimelineEntry(
                id=uuid.uuid4(),
                timestamp=session_ended_at,
                kind="SESSION_END",
                title="Session Completed",
                description="Engineering session ended.",
                related_file=None,
                related_event_id=None,
                analysis_reference=None,
            )
        )

    # Sort strictly by timestamp (though they mostly are, it's good practice)
    # Wait, python's list.sort is stable, so items with same timestamp stay in order
    # they were appended, which is exactly what we want.
    entries.sort(key=lambda e: e.timestamp)

    return ArchitectureTimeline(entries=entries)
