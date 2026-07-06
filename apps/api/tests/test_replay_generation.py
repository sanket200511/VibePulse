"""
Unit tests for the replay domain's pure render() function.

Builds inputs by first rendering a Timeline (reusing timeline/domain.py's
own render(), exactly the shape replay/service.py passes through in
production), then feeding the resulting entries into replay's render().

Tests cover:
- 1:1 frame lifting (same count, order, ids as timeline entries)
- Chapter hard boundaries: SESSION_START, IDLE_GAP/RESUMED, LANGUAGE_SWITCH,
  SESSION_END
- Chapter soft boundary: debounced directory-shift split within WORK
- Chapter labeling: keyword table, directory fallback, no-file-path fallback
- Chapters fully and contiguously cover every frame index
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.core.domain.events import AnalyzableEvent
from app.features.replay.domain import (
    CHAPTER_DIRECTORY_SHIFT_MIN_RUN,
    ChapterKind,
    render,
)
from app.features.timeline.domain import TimelineEntryKind, TimelineMarkerKind
from app.features.timeline.domain import render as render_timeline

BASE_TIME = datetime(2026, 7, 1, 12, 0, 0, tzinfo=UTC)
SESSION_ID = uuid.uuid4()


def _event(offset_seconds: float, **kwargs: object) -> AnalyzableEvent:
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


def _timeline(events: list[AnalyzableEvent], **kwargs: object):
    default_start = events[0].timestamp if events else BASE_TIME
    return render_timeline(
        events,
        {},
        session_started_at=kwargs.get("session_started_at", default_start),
        session_ended_at=kwargs.get("session_ended_at"),
        session_summary=None,
    )


def _replay(events: list[AnalyzableEvent], **kwargs: object):
    timeline = _timeline(events, **kwargs)
    return render(timeline.entries, session_id=SESSION_ID, generated_at=BASE_TIME)


class TestFrameLifting:
    def test_frame_count_matches_timeline_entry_count(self) -> None:
        events = [_event(0), _event(5)]
        timeline = _timeline(events, session_started_at=BASE_TIME)
        replay = render(timeline.entries, session_id=SESSION_ID, generated_at=BASE_TIME)

        assert len(replay.frames) == len(timeline.entries)

    def test_frames_preserve_entry_ids_and_order(self) -> None:
        events = [_event(0), _event(200, file_path="/repo/b.py")]
        timeline = _timeline(events, session_started_at=BASE_TIME)
        replay = render(timeline.entries, session_id=SESSION_ID, generated_at=BASE_TIME)

        assert [f.id for f in replay.frames] == [e.id for e in timeline.entries]
        assert [f.index for f in replay.frames] == list(range(len(replay.frames)))

    def test_frames_reuse_metadata_and_insights_verbatim(self) -> None:
        events = [_event(0, file_path="/repo/a.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        content_frame = next(f for f in replay.frames if f.kind != TimelineEntryKind.MARKER)
        assert content_frame.metadata.file_path == "/repo/a.py"

    def test_empty_session_has_single_frame(self) -> None:
        replay = _replay([], session_started_at=BASE_TIME)

        assert len(replay.frames) == 1
        assert replay.frames[0].metadata.marker_kind == TimelineMarkerKind.SESSION_START


class TestChapterHardBoundaries:
    def test_session_start_forms_standalone_chapter(self) -> None:
        events = [_event(0)]
        replay = _replay(events, session_started_at=BASE_TIME)

        start_chapter = replay.chapters[0]
        assert start_chapter.kind == ChapterKind.SESSION_STARTED
        assert start_chapter.start_frame_index == start_chapter.end_frame_index == 0

    def test_work_chapter_follows_session_start(self) -> None:
        events = [_event(0)]
        replay = _replay(events, session_started_at=BASE_TIME)

        assert replay.chapters[1].kind == ChapterKind.WORK

    def test_idle_gap_forms_standalone_chapter_followed_by_resumed(self) -> None:
        events = [_event(0, file_path="/repo/a.py"), _event(300, file_path="/repo/b.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        kinds = [c.kind for c in replay.chapters]
        assert ChapterKind.IDLE in kinds
        idle_index = kinds.index(ChapterKind.IDLE)
        assert kinds[idle_index + 1] == ChapterKind.RESUMED

        idle_chapter = replay.chapters[idle_index]
        assert idle_chapter.start_frame_index == idle_chapter.end_frame_index

    def test_language_switch_opens_new_work_chapter(self) -> None:
        events = [
            _event(0, file_path="/repo/a.py", language="python"),
            _event(5, file_path="/repo/b.ts", language="typescript"),
        ]
        replay = _replay(events, session_started_at=BASE_TIME)

        work_chapters = [c for c in replay.chapters if c.kind == ChapterKind.WORK]
        assert len(work_chapters) == 2

    def test_session_end_forms_terminal_chapter(self) -> None:
        events = [_event(0)]
        replay = _replay(
            events, session_started_at=BASE_TIME, session_ended_at=BASE_TIME + timedelta(seconds=5)
        )

        assert replay.chapters[-1].kind == ChapterKind.SESSION_COMPLETED

    def test_no_session_end_chapter_for_active_session(self) -> None:
        events = [_event(0)]
        replay = _replay(events, session_started_at=BASE_TIME, session_ended_at=None)

        assert all(c.kind != ChapterKind.SESSION_COMPLETED for c in replay.chapters)


class TestChapterSoftBoundary:
    def test_debounced_directory_shift_splits_work_chapter(self) -> None:
        run = CHAPTER_DIRECTORY_SHIFT_MIN_RUN
        events = [_event(0, file_path="/repo/src/a.py")]
        # Enough consecutive events in a new directory to clear the debounce.
        for i in range(run):
            events.append(_event(5 + i * 5, file_path=f"/repo/lib/f{i}.py"))
        replay = _replay(events, session_started_at=BASE_TIME)

        work_chapters = [c for c in replay.chapters if c.kind == ChapterKind.WORK]
        assert len(work_chapters) == 2

    def test_single_stray_file_does_not_split_chapter(self) -> None:
        events = [
            _event(0, file_path="/repo/src/a.py"),
            _event(5, file_path="/repo/lib/stray.py"),
            _event(10, file_path="/repo/src/b.py"),
        ]
        replay = _replay(events, session_started_at=BASE_TIME)

        work_chapters = [c for c in replay.chapters if c.kind == ChapterKind.WORK]
        assert len(work_chapters) == 1


class TestChapterLabeling:
    def test_auth_keyword_produces_authentication_label(self) -> None:
        events = [_event(0, file_path="/repo/src/auth/login.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        work_chapter = next(c for c in replay.chapters if c.kind == ChapterKind.WORK)
        assert work_chapter.label == "Authentication Work"

    def test_config_keyword_produces_configuration_label(self) -> None:
        events = [_event(0, file_path="/repo/config/settings.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        work_chapter = next(c for c in replay.chapters if c.kind == ChapterKind.WORK)
        assert work_chapter.label == "Configuration Changes"

    def test_unmatched_directory_falls_back_to_directory_label(self) -> None:
        events = [_event(0, file_path="/repo/widgets/thing.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        work_chapter = next(c for c in replay.chapters if c.kind == ChapterKind.WORK)
        assert work_chapter.label == "/repo/widgets Changes"

    def test_resumed_chapter_always_labeled_resumed(self) -> None:
        events = [
            _event(0, file_path="/repo/auth/a.py"),
            _event(300, file_path="/repo/auth/b.py"),
        ]
        replay = _replay(events, session_started_at=BASE_TIME)

        resumed_chapter = next(c for c in replay.chapters if c.kind == ChapterKind.RESUMED)
        assert resumed_chapter.label == "Resumed"

    def test_fixed_labels_for_structural_chapters(self) -> None:
        events = [_event(0)]
        replay = _replay(
            events, session_started_at=BASE_TIME, session_ended_at=BASE_TIME + timedelta(seconds=5)
        )

        by_kind = {c.kind: c.label for c in replay.chapters}
        assert by_kind[ChapterKind.SESSION_STARTED] == "Session Started"
        assert by_kind[ChapterKind.SESSION_COMPLETED] == "Session Completed"


class TestChapterCoverage:
    def test_chapters_contiguously_cover_every_frame(self) -> None:
        events = [
            _event(0, file_path="/repo/a.py"),
            _event(300, file_path="/repo/b.py"),
            _event(305, file_path="/repo/c.ts", language="typescript"),
        ]
        replay = _replay(
            events,
            session_started_at=BASE_TIME,
            session_ended_at=BASE_TIME + timedelta(seconds=400),
        )

        covered_indices: set[int] = set()
        for chapter in replay.chapters:
            for i in range(chapter.start_frame_index, chapter.end_frame_index + 1):
                covered_indices.add(i)
        assert covered_indices == set(range(len(replay.frames)))

    def test_every_frame_chapter_id_matches_a_real_chapter(self) -> None:
        events = [_event(0), _event(300, file_path="/repo/b.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        chapter_ids = {c.id for c in replay.chapters}
        assert all(f.chapter_id in chapter_ids for f in replay.frames)

    def test_chapter_start_flag_matches_chapter_start_frame_index(self) -> None:
        events = [_event(0), _event(300, file_path="/repo/b.py")]
        replay = _replay(events, session_started_at=BASE_TIME)

        start_indices = {c.start_frame_index for c in replay.chapters}
        flagged_indices = {f.index for f in replay.frames if f.is_chapter_start}
        assert flagged_indices == start_indices
