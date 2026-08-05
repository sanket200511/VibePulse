import uuid
from datetime import datetime

from pydantic import BaseModel


class BiographyEntry(BaseModel):
    timestamp: datetime
    event_id: uuid.UUID
    session_id: uuid.UUID
    finding: str


class EngineeringDNARead(BaseModel):
    identity: str
    path: str
    created_at: datetime | None
    last_seen: datetime | None
    observed_sessions: int
    observed_events: int
    functions_created: int
    functions_removed: int
    classes_created: int
    classes_removed: int
    imports_added: int
    imports_removed: int
    security_findings: int
    todos_created: int
    todos_resolved: int
    major_refactors: int
    rename_events: int
    largest_session: uuid.UUID | None
    first_authoring_session: uuid.UUID | None
    latest_authoring_session: uuid.UUID | None
    age: str

    biography: list[BiographyEntry]
