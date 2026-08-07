import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SubsequentEvent(BaseModel):
    """
    Represents a significant event (file edit, architecture, security)
    that occurred after an AI interaction.
    """

    event_type: str
    timestamp: datetime
    details: dict[str, str | int | float | bool | None]


class AIInteractionTimelineEntry(BaseModel):
    """
    A single AI interaction and the observable effects that followed it.
    """

    model_config = ConfigDict(from_attributes=True)

    event_id: uuid.UUID
    event_type: str
    timestamp: datetime
    provider: str | None = None
    model: str | None = None
    interaction_type: str | None = None
    conversation_id: str | None = None
    request_id: str | None = None
    prompt_size_bytes: int | None = None
    response_size_bytes: int | None = None
    tool_count: int | None = None

    files_modified_afterwards: list[str] = Field(default_factory=list)
    architecture_events_afterwards: list[SubsequentEvent] = Field(default_factory=list)
    security_events_afterwards: list[SubsequentEvent] = Field(default_factory=list)


class AIProvenanceStats(BaseModel):
    total_interactions: int = 0
    total_tools_executed: int = 0
    providers_used: list[str] = Field(default_factory=list)
    models_used: list[str] = Field(default_factory=list)


class AIProvenanceResponse(BaseModel):
    """
    The deterministic provenance history for a session or project.
    """

    stats: AIProvenanceStats
    timeline: list[AIInteractionTimelineEntry]
