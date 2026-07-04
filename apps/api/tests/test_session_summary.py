"""
Unit tests for HeuristicSessionSummaryGenerator.

Pure function over a SessionSnapshot — no DB, no async, no mocking.
"""

from datetime import UTC, datetime

from app.features.sessions.summary import HeuristicSessionSummaryGenerator, SessionSnapshot

generator = HeuristicSessionSummaryGenerator()


def _snapshot(**overrides: object) -> SessionSnapshot:
    base = {
        "project_root": "/home/dev/vibepulse",
        "started_at": datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
        "last_event_at": datetime(2026, 7, 4, 9, 25, tzinfo=UTC),
        "event_count": 12,
        "events_by_type": {"FILE_MODIFIED": 10, "FILE_CREATED": 2},
        "languages": {"python": 9, "typescript": 3},
        "files": {"a.py": 5, "b.py": 5, "c.ts": 2},
        "git_branch": "main",
    }
    base.update(overrides)
    return SessionSnapshot(**base)


def test_generate_computes_duration_in_seconds() -> None:
    summary = generator.generate(_snapshot())

    assert summary.duration_seconds == 25 * 60


def test_generate_picks_most_frequent_language() -> None:
    summary = generator.generate(_snapshot())

    assert summary.primary_language == "python"


def test_generate_picks_dominant_event_type() -> None:
    summary = generator.generate(_snapshot())

    assert summary.dominant_event_type == "FILE_MODIFIED"


def test_generate_counts_distinct_files() -> None:
    summary = generator.generate(_snapshot())

    assert summary.distinct_file_count == 3


def test_generate_handles_no_language_data() -> None:
    summary = generator.generate(_snapshot(languages={}))

    assert summary.primary_language is None
    assert "mostly in" not in summary.headline


def test_generate_headline_mentions_event_count() -> None:
    summary = generator.generate(_snapshot())

    assert "12 events" in summary.headline
