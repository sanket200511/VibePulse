"""
Replay response schemas — wire shape for GET /sessions/{session_id}/replay.

Mirrors timeline/schemas.py's structure: reuses the same
TimelineEntryMetadataRead/TimelineEntryInsightsRead shapes so a frame's
content is byte-for-byte the same JSON shape the dashboard already knows
how to render for a Timeline row (docs/adr/0008-replay-engine.md §2, §10).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.features.replay.domain import ChapterKind, Replay, ReplayChapter, ReplayFrame
from app.features.timeline.domain import TimelineEntryKind
from app.features.timeline.schemas import TimelineEntryInsightsRead, TimelineEntryMetadataRead


class ReplayFrameRead(BaseModel):
    id: uuid.UUID
    index: int
    timestamp: datetime
    kind: TimelineEntryKind
    metadata: TimelineEntryMetadataRead
    insights: TimelineEntryInsightsRead
    chapter_id: int
    is_chapter_start: bool

    @classmethod
    def from_frame(cls, frame: ReplayFrame) -> ReplayFrameRead:
        return cls(
            id=frame.id,
            index=frame.index,
            timestamp=frame.timestamp,
            kind=frame.kind,
            metadata=TimelineEntryMetadataRead(
                timestamp=frame.metadata.timestamp,
                event_type=frame.metadata.event_type,
                file_path=frame.metadata.file_path,
                language=frame.metadata.language,
                git_branch=frame.metadata.git_branch,
                group_size=frame.metadata.group_size,
                group_span_seconds=frame.metadata.group_span_seconds,
                member_event_ids=list(frame.metadata.member_event_ids),
                marker_kind=frame.metadata.marker_kind,
                marker_detail=frame.metadata.marker_detail,
            ),
            insights=TimelineEntryInsightsRead(analyzer_findings=frame.insights.analyzer_findings),
            chapter_id=frame.chapter_id,
            is_chapter_start=frame.is_chapter_start,
        )


class ReplayChapterRead(BaseModel):
    id: int
    label: str
    kind: ChapterKind
    start_frame_index: int
    end_frame_index: int
    start_timestamp: datetime
    end_timestamp: datetime
    duration_seconds: float
    summary_metrics: dict[str, Any]

    @classmethod
    def from_chapter(cls, chapter: ReplayChapter) -> ReplayChapterRead:
        return cls(
            id=chapter.id,
            label=chapter.label,
            kind=chapter.kind,
            start_frame_index=chapter.start_frame_index,
            end_frame_index=chapter.end_frame_index,
            start_timestamp=chapter.start_timestamp,
            end_timestamp=chapter.end_timestamp,
            duration_seconds=chapter.duration_seconds,
            summary_metrics=chapter.summary_metrics,
        )


class ReplayRead(BaseModel):
    """Response shape for GET /sessions/{session_id}/replay."""

    session_id: uuid.UUID
    generated_at: datetime
    frames: list[ReplayFrameRead]
    chapters: list[ReplayChapterRead]

    @classmethod
    def from_replay(cls, replay: Replay) -> ReplayRead:
        return cls(
            session_id=replay.session_id,
            generated_at=replay.generated_at,
            frames=[ReplayFrameRead.from_frame(frame) for frame in replay.frames],
            chapters=[ReplayChapterRead.from_chapter(chapter) for chapter in replay.chapters],
        )
