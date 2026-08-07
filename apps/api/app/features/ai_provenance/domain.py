"""
Domain models for AI Provenance.
Most structures are defined directly as schemas, but core domain constants or
dataclasses can live here if needed to avoid Pydantic coupling.
"""

from enum import StrEnum


class AIInteractionType(StrEnum):
    REQUEST_STARTED = "REQUEST_STARTED"
    RESPONSE_RECEIVED = "RESPONSE_RECEIVED"
    TOOL_EXECUTED = "TOOL_EXECUTED"
    COMPLETION_ACCEPTED = "COMPLETION_ACCEPTED"
