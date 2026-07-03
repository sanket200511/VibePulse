"""
Event type vocabulary.

A Python str-enum so values serialize as plain strings over the wire
(Pydantic/FastAPI JSON encoding) while remaining a real enum internally —
callers get exhaustiveness checks and IDE autocomplete instead of raw strings.
"""

from enum import StrEnum


class EventType(StrEnum):
    FILE_CREATED = "FILE_CREATED"
    FILE_MODIFIED = "FILE_MODIFIED"
    FILE_DELETED = "FILE_DELETED"


# Bumped whenever the DevelopmentEvent wire contract changes in a breaking way.
CURRENT_SCHEMA_VERSION = 1
