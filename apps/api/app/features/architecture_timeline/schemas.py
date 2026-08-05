"""
Architecture Timeline response schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from app.features.architecture_timeline.domain import (
    ArchitectureTimeline,
    ArchitectureTimelineEntry,
)
from pydantic import BaseModel


class ArchitectureTimelineEntryRead(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    kind: str
    title: str
    description: str | None
    related_file: str | None
    related_event_id: uuid.UUID | None
    analysis_reference: str | None
    severity: str | None

    @classmethod
    def from_entry(cls, entry: ArchitectureTimelineEntry) -> ArchitectureTimelineEntryRead:
        return cls(
            id=entry.id,
            timestamp=entry.timestamp,
            kind=entry.kind,
            title=entry.title,
            description=entry.description,
            related_file=entry.related_file,
            related_event_id=entry.related_event_id,
            analysis_reference=entry.analysis_reference,
            severity=entry.severity,
        )


class ArchitectureTimelineRead(BaseModel):
    session_id: uuid.UUID
    generated_at: datetime
    entries: list[ArchitectureTimelineEntryRead]

    @classmethod
    def from_timeline(
        cls, session_id: uuid.UUID, generated_at: datetime, timeline: ArchitectureTimeline
    ) -> ArchitectureTimelineRead:
        return cls(
            session_id=session_id,
            generated_at=generated_at,
            entries=[ArchitectureTimelineEntryRead.from_entry(e) for e in timeline.entries],
        )


class ProjectArchitectureTimelineRead(BaseModel):
    project_id: uuid.UUID
    generated_at: datetime
    entries: list[ArchitectureTimelineEntryRead]

    @classmethod
    def from_timeline(
        cls, project_id: uuid.UUID, generated_at: datetime, timeline: ArchitectureTimeline
    ) -> ProjectArchitectureTimelineRead:
        return cls(
            project_id=project_id,
            generated_at=generated_at,
            entries=[ArchitectureTimelineEntryRead.from_entry(e) for e in timeline.entries],
        )
