"""
Unit tests for the insights domain's rule-based generators and the
Developer Intelligence Engine's orchestration (build_profile).

Each generator is exercised directly against a SessionProfileInput built
from timeline.domain.render() output -- no database dependency. Mirrors the
style of test_timeline_generation.py.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.domain.events import AnalyzableEvent
from app.features.insights.domain import (
    ActivityInsightGenerator,
    ContextSwitchingInsightGenerator,
    DevelopmentPatternsInsightGenerator,
    DirectoriesInsightGenerator,
    FilesInsightGenerator,
    IdleBehaviourInsightGenerator,
    InsightCategory,
    LanguagesInsightGenerator,
    SessionProfileInput,
    SessionStatisticsInsightGenerator,
)
from app.features.insights.engine import build_profile
from app.features.sessions.constants import SessionStatus
from app.features.timeline.domain import render

BASE_TIME = datetime(2026, 7, 1, 12, 0, 0, tzinfo=UTC)


def _event(offset_seconds: float, **kwargs: Any) -> AnalyzableEvent:
    defaults: dict = {
        "id": uuid.uuid4(),
        "event_type": "FILE_MODIFIED",
        "timestamp": BASE_TIME + timedelta(seconds=offset_seconds),
        "session_id": uuid.uuid4(),
        "project_root": "/repo",
        "file_path": "/repo/src/app.py",
        "file_name": "app.py",
        "file_extension": ".py",
        "language": "python",
        "git_branch": "main",
        "metadata": {},
    }
    defaults.update(kwargs)
    return AnalyzableEvent(**defaults)


def _profile_input(events: list[AnalyzableEvent], **kwargs: Any) -> SessionProfileInput:
    default_start = events[0].timestamp if events else BASE_TIME
    timeline = render(
        events,
        {},
        session_started_at=kwargs.get("session_started_at", default_start),
        session_ended_at=kwargs.get("session_ended_at"),
        session_summary=kwargs.get("session_summary"),
    )
    return SessionProfileInput(
        entries=timeline.entries,
        outcome=timeline.outcome,
        session_status=kwargs.get("session_status", SessionStatus.ACTIVE),
        project_root=kwargs.get("project_root", "/repo"),
        git_branch=kwargs.get("git_branch", "main"),
    )


class TestActivityInsightGenerator:
    def test_empty_session_has_no_insights(self) -> None:
        profile_input = _profile_input([])
        assert ActivityInsightGenerator().generate(profile_input) == []

    def test_reports_event_count_and_rate(self) -> None:
        events = [_event(0), _event(30), _event(60)]
        profile_input = _profile_input(events)

        insights = ActivityInsightGenerator().generate(profile_input)

        assert len(insights) == 1
        assert "3 events" in insights[0].headline
        assert insights[0].metrics["events_per_minute"] == 3.0

    def test_identifies_busiest_window(self) -> None:
        events = [
            _event(0, file_path="/repo/a.py"),
            _event(10, file_path="/repo/a.py"),
            _event(20, file_path="/repo/a.py"),
            _event(400, file_path="/repo/b.py"),
        ]
        profile_input = _profile_input(events)

        insights = ActivityInsightGenerator().generate(profile_input)

        assert insights[0].metrics["busiest_window_event_count"] == 3
        assert insights[0].metrics["busiest_window_start_seconds"] == 0


class TestFilesInsightGenerator:
    def test_empty_session_has_no_insights(self) -> None:
        assert FilesInsightGenerator().generate(_profile_input([])) == []

    def test_identifies_most_active_file(self) -> None:
        events = [
            _event(0, file_path="/repo/a.py"),
            _event(5, file_path="/repo/a.py"),
            _event(10, file_path="/repo/a.py"),
            _event(200, file_path="/repo/b.py"),
        ]
        profile_input = _profile_input(events)

        insights = FilesInsightGenerator().generate(profile_input)

        assert len(insights) == 1
        assert "/repo/a.py" in insights[0].headline
        assert insights[0].metrics["top_files"][0] == {
            "file_path": "/repo/a.py",
            "event_count": 3,
        }


class TestDirectoriesInsightGenerator:
    def test_empty_session_has_no_insights(self) -> None:
        assert DirectoriesInsightGenerator().generate(_profile_input([])) == []

    def test_identifies_most_active_directory(self) -> None:
        events = [
            _event(0, file_path="/repo/src/a.py"),
            _event(200, file_path="/repo/src/b.py"),
            _event(400, file_path="/repo/tests/c.py"),
        ]
        profile_input = _profile_input(events)

        insights = DirectoriesInsightGenerator().generate(profile_input)

        assert len(insights) == 1
        assert "/repo/src" in insights[0].headline
        assert insights[0].metrics["directory_counts"]["/repo/src"] == 2


class TestLanguagesInsightGenerator:
    def test_empty_session_has_no_insights(self) -> None:
        assert LanguagesInsightGenerator().generate(_profile_input([])) == []

    def test_single_language_is_not_polyglot(self) -> None:
        events = [_event(0), _event(60), _event(120)]
        profile_input = _profile_input(events)

        insights = LanguagesInsightGenerator().generate(profile_input)

        assert insights[0].metrics["is_polyglot"] is False
        assert "python" in insights[0].headline

    def test_multiple_significant_languages_is_polyglot(self) -> None:
        events = [
            *[_event(i * 10, language="python") for i in range(7)],
            *[_event(70 + i * 10, language="typescript") for i in range(3)],
        ]
        profile_input = _profile_input(events)

        insights = LanguagesInsightGenerator().generate(profile_input)

        assert insights[0].metrics["is_polyglot"] is True
        assert "Polyglot" in insights[0].headline


class TestDevelopmentPatternsInsightGenerator:
    def test_plain_session_has_no_patterns(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(200, file_path="/repo/b.py")]
        assert DevelopmentPatternsInsightGenerator().generate(_profile_input(events)) == []

    def test_iterative_refinement_detected(self) -> None:
        events = [_event(0), _event(5), _event(10)]
        insights = DevelopmentPatternsInsightGenerator().generate(_profile_input(events))

        assert any("Iterative refinement" in i.headline for i in insights)

    def test_creation_burst_detected(self) -> None:
        events = [
            _event(0, event_type="FILE_CREATED", file_path="/repo/a.py"),
            _event(5, event_type="FILE_CREATED", file_path="/repo/b.py"),
            _event(10, event_type="FILE_CREATED", file_path="/repo/c.py"),
        ]
        insights = DevelopmentPatternsInsightGenerator().generate(_profile_input(events))

        assert any("Creation burst" in i.headline for i in insights)

    def test_cleanup_pass_detected(self) -> None:
        events = [
            _event(0, event_type="FILE_DELETED", file_path="/repo/a.py"),
            _event(5, event_type="FILE_DELETED", file_path="/repo/b.py"),
        ]
        insights = DevelopmentPatternsInsightGenerator().generate(_profile_input(events))

        assert any("Cleanup pass" in i.headline for i in insights)

    def test_broad_sweep_detected(self) -> None:
        events = [_event(i * 100, file_path=f"/repo/file_{i}.py") for i in range(5)]
        insights = DevelopmentPatternsInsightGenerator().generate(_profile_input(events))

        assert any("Broad sweep" in i.headline for i in insights)


class TestSessionStatisticsInsightGenerator:
    def test_empty_session_has_no_insights(self) -> None:
        assert SessionStatisticsInsightGenerator().generate(_profile_input([])) == []

    def test_reports_rollup_numbers(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(60, file_path="/repo/b.py")]
        profile_input = _profile_input(events)

        insights = SessionStatisticsInsightGenerator().generate(profile_input)

        assert insights[0].metrics["event_count"] == 2
        assert insights[0].metrics["distinct_file_count"] == 2
        assert insights[0].metrics["duration_seconds"] == 60


class TestContextSwitchingInsightGenerator:
    def test_fewer_than_two_entries_has_no_insights(self) -> None:
        events = [_event(0)]
        assert ContextSwitchingInsightGenerator().generate(_profile_input(events)) == []

    def test_counts_switches_and_longest_streak(self) -> None:
        events = [
            _event(0, event_type="FILE_CREATED", file_path="/repo/src/a.py", language="python"),
            _event(5, event_type="FILE_MODIFIED", file_path="/repo/src/a.py", language="python"),
            _event(45, event_type="FILE_MODIFIED", file_path="/repo/src/a.py", language="python"),
            _event(
                90, event_type="FILE_MODIFIED", file_path="/repo/tests/b.ts", language="typescript"
            ),
        ]
        profile_input = _profile_input(events)

        insights = ContextSwitchingInsightGenerator().generate(profile_input)

        assert insights[0].metrics["switch_count"] == 1
        assert insights[0].metrics["longest_streak_file"] == "/repo/src/a.py"
        assert insights[0].metrics["longest_streak_length"] == 3


class TestIdleBehaviourInsightGenerator:
    def test_no_idle_gaps_reports_continuous_activity(self) -> None:
        events = [_event(0), _event(10), _event(20)]
        insights = IdleBehaviourInsightGenerator().generate(_profile_input(events))

        assert insights[0].metrics["idle_gap_count"] == 0
        assert "No idle gaps" in insights[0].headline

    def test_idle_gap_duration_matches_actual_gap(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(300, file_path="/repo/b.py")]
        insights = IdleBehaviourInsightGenerator().generate(_profile_input(events))

        assert insights[0].metrics["idle_gap_count"] == 1
        assert insights[0].metrics["total_idle_seconds"] == 300.0


class TestBuildProfile:
    def test_groups_insights_by_category(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(60, file_path="/repo/b.py")]
        profile_input = _profile_input(events)

        profile = build_profile(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            profile_input=profile_input,
            generators=[FilesInsightGenerator(), SessionStatisticsInsightGenerator()],
        )

        assert InsightCategory.FILES in profile.categories
        assert InsightCategory.SESSION_STATISTICS in profile.categories

    def test_empty_categories_are_absent_not_empty_lists(self) -> None:
        profile = build_profile(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            profile_input=_profile_input([]),
            generators=[FilesInsightGenerator()],
        )

        assert InsightCategory.FILES not in profile.categories

    def test_disabled_generator_is_skipped(self) -> None:
        generator = FilesInsightGenerator()
        generator.enabled = False
        events = [_event(0, file_path="/repo/a.py")]

        profile = build_profile(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            profile_input=_profile_input(events),
            generators=[generator],
        )

        assert profile.categories == {}

    def test_failing_generator_does_not_abort_other_generators(self) -> None:
        class _FailingGenerator:
            name = "failing"
            version = 1
            category = InsightCategory.ACTIVITY
            description = "always raises"
            priority = 5
            enabled = True

            def generate(self, profile_input: SessionProfileInput) -> list:
                raise RuntimeError("boom")

        events = [_event(0, file_path="/repo/a.py")]
        profile = build_profile(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            profile_input=_profile_input(events),
            generators=[_FailingGenerator(), FilesInsightGenerator()],
        )

        assert InsightCategory.ACTIVITY not in profile.categories
        assert InsightCategory.FILES in profile.categories
