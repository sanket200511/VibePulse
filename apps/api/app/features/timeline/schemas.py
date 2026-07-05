"""
Timeline response schemas — wire shape for GET /sessions/{session_id}/timeline.

Deliberately mirrors the TimelineEntry metadata/insights split from
domain.py rather than flattening it, so the dashboard receives the same
extensibility boundary the backend design guarantees (approved refinement
#1, docs/adr/0006-session-timeline.md).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.features.timeline.domain import (
    Timeline,
    TimelineEntry,
    TimelineEntryKind,
    TimelineMarkerKind,
)


class TimelineEntryMetadataRead(BaseModel):
    timestamp: datetime
    event_type: str | None
    file_path: str | None
    language: str | None
    git_branch: str | None
    group_size: int
    group_span_seconds: float | None
    member_event_ids: list[uuid.UUID]
    marker_kind: TimelineMarkerKind | None
    marker_detail: str | None


class TimelineEntryInsightsRead(BaseModel):
    analyzer_findings: dict[str, dict[str, Any]]


class TimelineEntryRead(BaseModel):
    id: uuid.UUID
    entry_kind: TimelineEntryKind
    metadata: TimelineEntryMetadataRead
    insights: TimelineEntryInsightsRead

    @classmethod
    def from_entry(cls, entry: TimelineEntry) -> TimelineEntryRead:
        return cls(
            id=entry.id,
            entry_kind=entry.entry_kind,
            metadata=TimelineEntryMetadataRead(
                timestamp=entry.metadata.timestamp,
                event_type=entry.metadata.event_type,
                file_path=entry.metadata.file_path,
                language=entry.metadata.language,
                git_branch=entry.metadata.git_branch,
                group_size=entry.metadata.group_size,
                group_span_seconds=entry.metadata.group_span_seconds,
                member_event_ids=list(entry.metadata.member_event_ids),
                marker_kind=entry.metadata.marker_kind,
                marker_detail=entry.metadata.marker_detail,
            ),
            insights=TimelineEntryInsightsRead(analyzer_findings=entry.insights.analyzer_findings),
        )


class TimelineLargestChangeRead(BaseModel):
    file_path: str
    event_count: int


class SessionOutcomeRead(BaseModel):
    """Wire shape for the Session Outcome card (approved refinement #4)."""

    duration_seconds: float
    event_count: int
    distinct_file_count: int
    primary_language: str | None
    languages: dict[str, int]
    largest_change: TimelineLargestChangeRead | None
    session_summary: dict[str, Any] | None


class TimelineRead(BaseModel):
    """Response shape for GET /sessions/{session_id}/timeline."""

    session_id: uuid.UUID
    generated_at: datetime
    entries: list[TimelineEntryRead]
    outcome: SessionOutcomeRead

    @classmethod
    def from_timeline(
        cls, session_id: uuid.UUID, generated_at: datetime, timeline: Timeline
    ) -> TimelineRead:
        outcome = timeline.outcome
        return cls(
            session_id=session_id,
            generated_at=generated_at,
            entries=[TimelineEntryRead.from_entry(entry) for entry in timeline.entries],
            outcome=SessionOutcomeRead(
                duration_seconds=outcome.duration_seconds,
                event_count=outcome.event_count,
                distinct_file_count=outcome.distinct_file_count,
                primary_language=outcome.primary_language,
                languages=outcome.languages,
                largest_change=(
                    TimelineLargestChangeRead(
                        file_path=outcome.largest_change.file_path,
                        event_count=outcome.largest_change.event_count,
                    )
                    if outcome.largest_change is not None
                    else None
                ),
                session_summary=outcome.session_summary,
            ),
        )
