"""
Development event request/response schemas.

DevelopmentEventRead is the single source of truth for the wire shape —
used for both the GET /events REST response and the /ws/events broadcast
payload, so REST and WebSocket clients never see divergent contracts.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field

from app.features.events.constants import CURRENT_SCHEMA_VERSION, EventType

if TYPE_CHECKING:
    from app.features.events.models import DevelopmentEvent


class ObservationCommandRequest(BaseModel):
    """Payload to start or stop observation."""

    session_id: uuid.UUID
    timestamp: datetime


class DevelopmentEventCreate(BaseModel):
    """Payload accepted by POST /events."""

    schema_version: int = Field(default=CURRENT_SCHEMA_VERSION)
    daemon_seq: int = 0
    event_type: EventType
    timestamp: datetime
    session_id: uuid.UUID
    project_root: str = Field(min_length=1, max_length=1024)
    file_path: str | None = Field(default=None, min_length=1, max_length=2048)
    file_name: str | None = Field(default=None, min_length=1, max_length=255)
    file_extension: str | None = None
    language: str | None = None
    git_branch: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DevelopmentEventRead(BaseModel):
    """
    Response shape for GET /events and the /ws/events broadcast.

    Built explicitly from ORM instances via `from_orm_event()` rather than
    relying on `from_attributes` — the ORM column is named `event_metadata`
    (to avoid colliding with SQLAlchemy's reserved `Base.metadata`), but the
    public wire field is `metadata`. An explicit mapping is clearer than an
    alias trick that depends on from_attributes lookup order.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    schema_version: int
    daemon_seq: int
    event_type: EventType
    timestamp: datetime
    server_received_at: datetime
    session_id: uuid.UUID
    project_root: str
    file_path: str | None
    file_name: str | None
    file_extension: str | None
    language: str | None
    git_branch: str | None
    metadata: dict[str, Any]
    created_at: datetime

    @classmethod
    def from_orm_event(cls, event: "DevelopmentEvent") -> "DevelopmentEventRead":
        return cls(
            id=event.id,
            schema_version=event.schema_version,
            daemon_seq=event.daemon_seq,
            event_type=EventType(event.event_type),
            timestamp=event.timestamp,
            server_received_at=event.server_received_at,
            session_id=event.session_id,
            project_root=event.project_root,
            file_path=event.file_path,
            file_name=event.file_name,
            file_extension=event.file_extension,
            language=event.language,
            git_branch=event.git_branch,
            metadata=event.event_metadata,
            created_at=event.created_at,
        )


class DevelopmentEventList(BaseModel):
    """Response shape for GET /events."""

    events: list[DevelopmentEventRead]
