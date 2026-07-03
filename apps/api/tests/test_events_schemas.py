"""Schema validation tests for the events feature — no database required."""

import uuid
from datetime import UTC, datetime

import pytest
from app.features.events.constants import CURRENT_SCHEMA_VERSION, EventType
from app.features.events.schemas import DevelopmentEventCreate
from pydantic import ValidationError


def _payload(**overrides: object) -> dict:
    base = {
        "event_type": EventType.FILE_MODIFIED,
        "timestamp": datetime.now(UTC),
        "session_id": uuid.uuid4(),
        "project_root": "/home/dev/vibepulse",
        "file_path": "/home/dev/vibepulse/apps/api/app/main.py",
        "file_name": "main.py",
    }
    base.update(overrides)
    return base


def test_defaults_schema_version_to_current() -> None:
    event = DevelopmentEventCreate(**_payload())
    assert event.schema_version == CURRENT_SCHEMA_VERSION


def test_accepts_valid_event_type_string() -> None:
    event = DevelopmentEventCreate(**_payload(event_type="FILE_CREATED"))
    assert event.event_type is EventType.FILE_CREATED


def test_rejects_invalid_event_type() -> None:
    with pytest.raises(ValidationError):
        DevelopmentEventCreate(**_payload(event_type="NOT_A_REAL_EVENT"))


def test_rejects_empty_file_path() -> None:
    with pytest.raises(ValidationError):
        DevelopmentEventCreate(**_payload(file_path=""))


def test_metadata_defaults_to_empty_dict() -> None:
    event = DevelopmentEventCreate(**_payload())
    assert event.metadata == {}


def test_optional_fields_default_to_none() -> None:
    event = DevelopmentEventCreate(**_payload())
    assert event.file_extension is None
    assert event.language is None
    assert event.git_branch is None
