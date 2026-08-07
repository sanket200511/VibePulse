"""
Unit tests for the timeline domain's pure render() function.

Tests cover:
- Chronological ordering and session start/end markers
- Semantic grouping: consecutive FILE_MODIFIED on the same file group;
  FILE_CREATED/FILE_DELETED never group, even when adjacent in time
- Idle gap markers and language-switch markers
- Session Outcome computation, including the "largest change" fallback
  when no file was edited more than once
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.domain.events import AnalyzableEvent
from app.features.timeline.domain import (
    TimelineEntryKind,
    TimelineMarkerKind,
    render,
)

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


def _render(events: list[AnalyzableEvent], **kwargs: Any):
    default_start = events[0].timestamp if events else BASE_TIME
    return render(
        events,
        {},
        session_started_at=kwargs.get("session_started_at", default_start),
        session_ended_at=kwargs.get("session_ended_at"),
        session_summary=kwargs.get("session_summary"),
    )


class TestOrderingAndMarkers:
    def test_empty_session_has_only_start_marker(self) -> None:
        timeline = _render([], session_started_at=BASE_TIME)

        assert len(timeline.entries) == 1
        assert timeline.entries[0].metadata.marker_kind == TimelineMarkerKind.SESSION_START

    def test_session_end_marker_present_when_session_completed(self) -> None:
        events = [_event(0)]
        timeline = _render(
            events, session_started_at=BASE_TIME, session_ended_at=BASE_TIME + timedelta(seconds=5)
        )

        assert timeline.entries[-1].metadata.marker_kind == TimelineMarkerKind.SESSION_END

    def test_session_end_marker_absent_for_active_session(self) -> None:
        events = [_event(0)]
        timeline = _render(events, session_started_at=BASE_TIME, session_ended_at=None)

        assert all(
            e.metadata.marker_kind != TimelineMarkerKind.SESSION_END for e in timeline.entries
        )

    def test_entries_preserve_chronological_order(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(200, file_path="/repo/b.py")]
        timeline = _render(events, session_started_at=BASE_TIME)

        timestamps = [e.metadata.timestamp for e in timeline.entries]
        assert timestamps == sorted(timestamps)


class TestGroupingHeuristics:
    def test_consecutive_modifications_to_same_file_group(self) -> None:
        events = [_event(0), _event(5), _event(10)]
        timeline = _render(events, session_started_at=BASE_TIME)

        content_entries = [e for e in timeline.entries if e.entry_kind != TimelineEntryKind.MARKER]
        assert len(content_entries) == 1
        assert content_entries[0].entry_kind == TimelineEntryKind.GROUP
        assert content_entries[0].metadata.group_size == 3

    def test_modifications_beyond_gap_threshold_do_not_group(self) -> None:
        events = [_event(0), _event(1000)]
        timeline = _render(events, session_started_at=BASE_TIME)

        content_entries = [e for e in timeline.entries if e.entry_kind != TimelineEntryKind.MARKER]
        assert len(content_entries) == 2
        assert all(e.entry_kind == TimelineEntryKind.EVENT for e in content_entries)

    def test_modifications_to_different_files_do_not_group(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(5, file_path="/repo/b.py")]
        timeline = _render(events, session_started_at=BASE_TIME)

        content_entries = [e for e in timeline.entries if e.entry_kind != TimelineEntryKind.MARKER]
        assert len(content_entries) == 2

    def test_file_created_never_groups_with_adjacent_modifications(self) -> None:
        events = [
            _event(0, event_type="FILE_CREATED"),
            _event(1, event_type="FILE_MODIFIED"),
            _event(2, event_type="FILE_MODIFIED"),
        ]
        timeline = _render(events, session_started_at=BASE_TIME)

        content_entries = [e for e in timeline.entries if e.entry_kind != TimelineEntryKind.MARKER]
        # FILE_CREATED stands alone; the two FILE_MODIFIED events group.
        assert len(content_entries) == 2
        assert content_entries[0].entry_kind == TimelineEntryKind.EVENT
        assert content_entries[0].metadata.event_type == "FILE_CREATED"
        assert content_entries[1].entry_kind == TimelineEntryKind.GROUP
        assert content_entries[1].metadata.group_size == 2

    def test_file_deleted_never_groups(self) -> None:
        events = [
            _event(0, event_type="FILE_MODIFIED"),
            _event(1, event_type="FILE_DELETED"),
        ]
        timeline = _render(events, session_started_at=BASE_TIME)

        content_entries = [e for e in timeline.entries if e.entry_kind != TimelineEntryKind.MARKER]
        assert len(content_entries) == 2
        assert all(e.entry_kind == TimelineEntryKind.EVENT for e in content_entries)

    def test_group_span_seconds_reflects_first_to_last_gap(self) -> None:
        events = [_event(0), _event(5), _event(12)]
        timeline = _render(events, session_started_at=BASE_TIME)

        group = next(e for e in timeline.entries if e.entry_kind == TimelineEntryKind.GROUP)
        assert group.metadata.group_span_seconds == 12


class TestMarkerGeneration:
    def test_idle_gap_marker_inserted_beyond_threshold(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(300, file_path="/repo/b.py")]
        timeline = _render(events, session_started_at=BASE_TIME)

        idle_markers = [
            e for e in timeline.entries if e.metadata.marker_kind == TimelineMarkerKind.IDLE_GAP
        ]
        assert len(idle_markers) == 1

    def test_no_idle_marker_for_short_gap(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(10, file_path="/repo/b.py")]
        timeline = _render(events, session_started_at=BASE_TIME)

        idle_markers = [
            e for e in timeline.entries if e.metadata.marker_kind == TimelineMarkerKind.IDLE_GAP
        ]
        assert idle_markers == []

    def test_language_switch_marker_inserted(self) -> None:
        events = [
            _event(0, file_path="/repo/a.py", language="python"),
            _event(5, file_path="/repo/b.ts", language="typescript"),
        ]
        timeline = _render(events, session_started_at=BASE_TIME)

        switch_markers = [
            e
            for e in timeline.entries
            if e.metadata.marker_kind == TimelineMarkerKind.LANGUAGE_SWITCH
        ]
        assert len(switch_markers) == 1
        assert switch_markers[0].metadata.marker_detail == "python -> typescript"

    def test_no_language_switch_marker_for_first_event(self) -> None:
        events = [_event(0, language="python")]
        timeline = _render(events, session_started_at=BASE_TIME)

        switch_markers = [
            e
            for e in timeline.entries
            if e.metadata.marker_kind == TimelineMarkerKind.LANGUAGE_SWITCH
        ]
        assert switch_markers == []


class TestSessionOutcome:
    def test_outcome_counts_events_and_files(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(5, file_path="/repo/b.py")]
        timeline = _render(events, session_started_at=BASE_TIME)

        assert timeline.outcome.event_count == 2
        assert timeline.outcome.distinct_file_count == 2

    def test_largest_change_none_when_no_file_edited_more_than_once(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(5, file_path="/repo/b.py")]
        timeline = _render(events, session_started_at=BASE_TIME)

        assert timeline.outcome.largest_change is None

    def test_largest_change_identifies_most_edited_file(self) -> None:
        events = [
            _event(0, file_path="/repo/a.py"),
            _event(5, file_path="/repo/a.py"),
            _event(10, file_path="/repo/a.py"),
            _event(15, file_path="/repo/b.py"),
        ]
        timeline = _render(events, session_started_at=BASE_TIME)

        assert timeline.outcome.largest_change is not None
        assert timeline.outcome.largest_change.file_path == "/repo/a.py"
        assert timeline.outcome.largest_change.event_count == 3

    def test_outcome_duration_uses_session_end_when_available(self) -> None:
        events = [_event(0)]
        timeline = _render(
            events, session_started_at=BASE_TIME, session_ended_at=BASE_TIME + timedelta(seconds=60)
        )

        assert timeline.outcome.duration_seconds == 60

    def test_outcome_passes_through_session_summary(self) -> None:
        summary = {"headline": "3 events over 1 min"}
        events = [_event(0)]
        timeline = _render(events, session_started_at=BASE_TIME, session_summary=summary)

        assert timeline.outcome.session_summary == summary

    def test_empty_session_has_zero_duration_and_no_largest_change(self) -> None:
        timeline = _render([], session_started_at=BASE_TIME)

        assert timeline.outcome.event_count == 0
        assert timeline.outcome.duration_seconds == 0
        assert timeline.outcome.largest_change is None
