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


class ProjectListRead(BaseModel):
    projects: list[ProjectRead]
