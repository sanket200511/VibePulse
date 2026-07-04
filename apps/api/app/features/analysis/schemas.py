"""
Pydantic response schemas for the analysis API.

These are read-only; there are no request schemas because analysis runs are
triggered internally (via BackgroundTasks), not by the caller.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class EventAnalysisRead(BaseModel):
    """Serialised view of a single EventAnalysis row."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    analyzer_name: str
    analyzer_version: int
    findings: dict[str, Any]
    duration_ms: float
    error: str | None
    created_at: datetime


class EventAnalysisListRead(BaseModel):
    """Envelope returned by GET /events/{event_id}/analysis."""

    event_id: uuid.UUID
    analyses: list[EventAnalysisRead]
