"""
Session lifecycle vocabulary.

A Python str-enum so values serialize as plain strings over the wire
(Pydantic/FastAPI JSON encoding) while remaining a real enum internally.

Lifecycle: ACTIVE -> IDLE -> COMPLETED (terminal). See docs/adr/0005-session-engine.md.
"""

from enum import StrEnum


class SessionStatus(StrEnum):
    ACTIVE = "ACTIVE"
    IDLE = "IDLE"
    COMPLETED = "COMPLETED"
