import uuid
from datetime import UTC, datetime

from app.core.domain.events import AnalyzableEvent
from app.features.architecture_timeline.domain import build_architecture_timeline


def test_build_architecture_timeline():
    event_id = uuid.uuid4()
    events = [
        AnalyzableEvent(
            id=event_id,
            event_type="FILE_MODIFIED",
            timestamp=datetime.now(tz=UTC),
            session_id=uuid.uuid4(),
            project_root="/test",
            file_path="test.py",
            file_name="test.py",
            file_extension=".py",
            language="python",
            git_branch="main",
            metadata={},
        )
    ]

    analyses = {
        event_id: {
            "code_evolution": {"observations": [{"kind": "FUNCTION_ADDED", "symbol": "foo"}]},
            "security_guardian": {
                "findings": [
                    {
                        "title": "Hardcoded Password",
                        "severity": "HIGH",
                        "file": "test.py",
                        "evidence": "password='foo'",
                    }
                ]
            },
        }
    }

    session_start = datetime.now(tz=UTC)
    session_end = datetime.now(tz=UTC)

    timeline = build_architecture_timeline(
        events, analyses, session_started_at=session_start, session_ended_at=session_end
    )

    assert timeline is not None
    assert len(timeline.entries) == 4

    kinds = [e.kind for e in timeline.entries]
    assert "SESSION_START" in kinds
    assert "FUNCTION_ADDED" in kinds
    assert "SECURITY_FINDING" in kinds
    assert "SESSION_END" in kinds


def test_empty_session_architecture_timeline():
    session_start = datetime.now(tz=UTC)
    timeline = build_architecture_timeline(
        [], {}, session_started_at=session_start, session_ended_at=None
    )

    assert len(timeline.entries) == 1
    assert timeline.entries[0].kind == "SESSION_START"
