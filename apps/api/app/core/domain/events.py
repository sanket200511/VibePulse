"""
Shared domain types for cross-feature event data.

These types are framework-agnostic (no SQLAlchemy, no Pydantic) and live in
core/domain so that feature modules can import them without violating the
feature-isolation rule (ADR 0002).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class AnalyzableEvent:
    """
    A plain, immutable snapshot of a DevelopmentEvent that is safe to pass
    across feature boundaries and into the analysis pipeline.

    Constructed from a DevelopmentEventRead schema object in events/service.py
    so that the analysis feature never needs to import from the events feature.
    """

    id: uuid.UUID
    event_type: str
    timestamp: datetime
    session_id: uuid.UUID
    project_root: str
    file_path: str
    file_name: str
    file_extension: str | None
    language: str | None
    git_branch: str | None
    metadata: dict[str, Any]
