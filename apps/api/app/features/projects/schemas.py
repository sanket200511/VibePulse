from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectRead(BaseModel):
    """Canonical Project response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    root_path: str
    created_at: datetime
    updated_at: datetime


class ProjectCreate(BaseModel):
    """Request schema to ensure or register a project."""

    root_path: str
    display_name: str | None = None


class ProjectListRead(BaseModel):
    projects: list[ProjectRead]


class ObservationWindow(BaseModel):
    first_observed_at: datetime | None
    latest_observed_at: datetime | None


class ProjectIntelligenceMetrics(BaseModel):
    total_sessions: int
    total_events: int


class ActivitySeriesItem(BaseModel):
    session_id: uuid.UUID
    started_at: datetime
    event_count: int
    status: str


class FrequentlyObservedFile(BaseModel):
    path: str
    event_count: int


class ProjectIntelligenceRead(BaseModel):
    project_id: uuid.UUID
    observation_window: ObservationWindow
    metrics: ProjectIntelligenceMetrics
    activity_series: list[ActivitySeriesItem]
    event_composition: dict[str, int]
    language_activity: dict[str, int]
    frequently_observed_files: list[FrequentlyObservedFile]


class DeletedCounts(BaseModel):
    events: int
    sessions: int
    analyses: int
    investigations: int
    context: int


class ProjectDeleteResponse(BaseModel):
    deleted: bool = True
    project_id: uuid.UUID
    project_name: str
    deleted_counts: DeletedCounts
