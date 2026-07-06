"""
Replay domain — pure, framework-free construction of a Session Replay.

Replay is a projection over an already-rendered Timeline: it lifts each
TimelineEntry into a ReplayFrame 1:1 (same order, same data, nothing
recomputed) and derives chapter boundaries/labels over that same sequence.
No I/O happens here (that belongs in service.py); no AI, no heuristics
beyond marker lookups, path-prefix keyword matching, and a consecutive-run
counter. See docs/adr/0008-replay-engine.md.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

from app.features.timeline.domain import (
    TimelineEntry,
    TimelineEntryKind,
    TimelineInsights,
    TimelineMarkerKind,
    TimelineMetadata,
)

# A run of this many consecutive content frames sharing a new dominant
# directory is required before a soft (directory-shift) chapter boundary is
# cut — debounces a single stray file from fragmenting a chapter (see ADR
# 0008 §3).
CHAPTER_DIRECTORY_SHIFT_MIN_RUN = 3

# Ordered path-prefix/substring -> label table for WORK/RESUMED chapter
# labeling. Checked in order; first match wins. Deliberately simple string
# matching, not AI (ADR 0008 §3, Sprint 6 constraint: no AI).
_LABEL_KEYWORDS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("auth", "login", "session", "jwt", "oauth"), "Authentication Work"),
    (("config", ".env", "settings", "docker"), "Configuration Changes"),
    (("api/", "backend/", "server/"), "Backend Refactor"),
)


class ChapterKind(StrEnum):
    SESSION_STARTED = "SESSION_STARTED"
    WORK = "WORK"
    IDLE = "IDLE"
    RESUMED = "RESUMED"
    SESSION_COMPLETED = "SESSION_COMPLETED"


@dataclass(frozen=True)
class ReplayFrame:
    """
    One step of playback — a 1:1 lift of a TimelineEntry, plus chapter
    linkage. Reuses TimelineMetadata/TimelineInsights verbatim rather than
    copying or transforming their contents (ADR 0008 §2).
    """

    id: uuid.UUID
    index: int
    timestamp: datetime
    kind: TimelineEntryKind
    metadata: TimelineMetadata
    insights: TimelineInsights
    chapter_id: int
    is_chapter_start: bool


@dataclass(frozen=True)
class ReplayChapter:
    """A named, contiguous span of frame indices — a derived navigation index,
    not a behavior source."""

    id: int
    label: str
    kind: ChapterKind
    start_frame_index: int
    end_frame_index: int
    start_timestamp: datetime
    end_timestamp: datetime
    duration_seconds: float
    summary_metrics: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Replay:
    """Full render() output: chronologically ordered frames plus derived chapters."""

    session_id: uuid.UUID
    generated_at: datetime
    frames: list[ReplayFrame]
    chapters: list[ReplayChapter]


@dataclass
class _ChapterAccumulator:
    """Internal, mutable in-progress chapter. Not exposed."""

    kind: ChapterKind
    start_frame_index: int
    frame_indices: list[int]
    dominant_directory: str | None
    directory_run_start: int | None
    directory_run_dir: str | None


def _directory_of(file_path: str | None) -> str | None:
    if not file_path:
        return None
    if "/" not in file_path:
        return None
    return file_path.rsplit("/", 1)[0]


def _is_content_entry(entry: TimelineEntry) -> bool:
    return entry.entry_kind in (TimelineEntryKind.EVENT, TimelineEntryKind.GROUP)


def _label_for(entries: list[TimelineEntry]) -> str:
    """Keyword match over a chapter's content file paths, first match wins, falling
    back to '{directory} Changes', or 'Session Activity' if no file paths exist."""
    paths = [
        entry.metadata.file_path
        for entry in entries
        if _is_content_entry(entry) and entry.metadata.file_path
    ]
    lowered = [path.lower() for path in paths]

    for keywords, label in _LABEL_KEYWORDS:
        if any(keyword in path for keyword in keywords for path in lowered):
            return label

    directories = [d for d in (_directory_of(p) for p in paths) if d]
    if directories:
        top_directory = max(set(directories), key=directories.count)
        return f"{top_directory} Changes"

    return "Session Activity"


def _chapter_from(
    chapter_id: int,
    accumulator: _ChapterAccumulator,
    entries: list[TimelineEntry],
    *,
    fixed_label: str | None,
) -> ReplayChapter:
    member_entries = [entries[i] for i in accumulator.frame_indices]
    label = fixed_label if fixed_label is not None else _label_for(member_entries)
    start_entry = entries[accumulator.frame_indices[0]]
    end_entry = entries[accumulator.frame_indices[-1]]
    duration = (end_entry.metadata.timestamp - start_entry.metadata.timestamp).total_seconds()

    return ReplayChapter(
        id=chapter_id,
        label=label,
        kind=accumulator.kind,
        start_frame_index=accumulator.frame_indices[0],
        end_frame_index=accumulator.frame_indices[-1],
        start_timestamp=start_entry.metadata.timestamp,
        end_timestamp=end_entry.metadata.timestamp,
        duration_seconds=max(duration, 0.0),
        summary_metrics={},
    )


_FIXED_LABELS: dict[ChapterKind, str] = {
    ChapterKind.SESSION_STARTED: "Session Started",
    ChapterKind.IDLE: "Idle",
    ChapterKind.RESUMED: "Resumed",
    ChapterKind.SESSION_COMPLETED: "Session Completed",
}


def _derive_chapters(entries: list[TimelineEntry]) -> list[ReplayChapter]:
    """
    Walk entries once, cutting hard boundaries on markers and soft
    boundaries on a debounced directory shift within WORK chapters. See ADR
    0008 §3 for the full rule set.

    SESSION_START and IDLE_GAP markers form their own standalone 1-frame
    chapter; the entry immediately following opens the next chapter
    (WORK / RESUMED respectively) — tracked via ``pending_kind`` since that
    following entry is not known until the next loop iteration.
    LANGUAGE_SWITCH markers instead become the *first* frame of the new WORK
    chapter they open, and SESSION_END opens a terminal SESSION_COMPLETED
    chapter that simply runs to the end of ``entries``.
    """
    if not entries:
        return []

    chapters: list[ReplayChapter] = []
    chapter_id = 0
    current: _ChapterAccumulator | None = None
    pending_kind: ChapterKind | None = None

    def new_accum(kind: ChapterKind, index: int) -> _ChapterAccumulator:
        return _ChapterAccumulator(
            kind=kind,
            start_frame_index=index,
            frame_indices=[index],
            dominant_directory=None,
            directory_run_start=None,
            directory_run_dir=None,
        )

    def flush() -> None:
        nonlocal current, chapter_id
        if current is None:
            return
        fixed = _FIXED_LABELS.get(current.kind)
        chapters.append(_chapter_from(chapter_id, current, entries, fixed_label=fixed))
        chapter_id += 1
        current = None

    for index, entry in enumerate(entries):
        marker_kind = entry.metadata.marker_kind

        if marker_kind == TimelineMarkerKind.SESSION_START:
            flush()
            current = new_accum(ChapterKind.SESSION_STARTED, index)
            flush()
            pending_kind = ChapterKind.WORK
            continue

        if marker_kind == TimelineMarkerKind.SESSION_END:
            flush()
            current = new_accum(ChapterKind.SESSION_COMPLETED, index)
            pending_kind = None
            continue

        if marker_kind == TimelineMarkerKind.IDLE_GAP:
            flush()
            current = new_accum(ChapterKind.IDLE, index)
            flush()
            pending_kind = ChapterKind.RESUMED
            continue

        if marker_kind == TimelineMarkerKind.LANGUAGE_SWITCH:
            flush()
            current = new_accum(ChapterKind.WORK, index)
            pending_kind = None
            continue

        frame_already_recorded = False
        if pending_kind is not None:
            current = new_accum(pending_kind, index)
            pending_kind = None
            frame_already_recorded = True
        elif current is None:
            # Defensive: a Timeline always opens with SESSION_START, but
            # guard against an empty/malformed input rather than raising.
            current = new_accum(ChapterKind.WORK, index)
            frame_already_recorded = True

        if not frame_already_recorded:
            current.frame_indices.append(index)

        # Note: this frame may be the first member of a chapter just opened
        # above (via pending_kind) — it must still be considered for the
        # directory-shift check below, not skipped, or a WORK chapter's
        # dominant_directory would never be seeded from its own first frame.
        if current.kind != ChapterKind.WORK or not _is_content_entry(entry):
            continue

        directory = _directory_of(entry.metadata.file_path)
        if directory is None:
            continue

        if current.dominant_directory is None:
            current.dominant_directory = directory
            continue

        if directory == current.dominant_directory:
            current.directory_run_start = None
            current.directory_run_dir = None
            continue

        if current.directory_run_dir == directory and current.directory_run_start is not None:
            run_length = index - current.directory_run_start + 1
            if run_length >= CHAPTER_DIRECTORY_SHIFT_MIN_RUN:
                # Cut a new WORK chapter starting at the first frame of the run.
                split_at = current.directory_run_start
                carried_over = [i for i in current.frame_indices if i >= split_at]
                current.frame_indices = [i for i in current.frame_indices if i < split_at]
                if current.frame_indices:
                    flush()
                current = _ChapterAccumulator(
                    kind=ChapterKind.WORK,
                    start_frame_index=split_at,
                    frame_indices=carried_over,
                    dominant_directory=directory,
                    directory_run_start=None,
                    directory_run_dir=None,
                )
        else:
            current.directory_run_dir = directory
            current.directory_run_start = index

    flush()
    return chapters


def _frame_from(
    entry: TimelineEntry, index: int, chapter_id: int, *, is_start: bool
) -> ReplayFrame:
    return ReplayFrame(
        id=entry.id,
        index=index,
        timestamp=entry.metadata.timestamp,
        kind=entry.entry_kind,
        metadata=entry.metadata,
        insights=entry.insights,
        chapter_id=chapter_id,
        is_chapter_start=is_start,
    )


def render(
    entries: list[TimelineEntry],
    *,
    session_id: uuid.UUID,
    generated_at: datetime,
) -> Replay:
    """
    Build the ordered replay frames plus derived chapters for a session's
    already-rendered Timeline entries.

    ``entries`` must already be in chronological order (the caller,
    ReplayService, guarantees this by passing through Timeline's own
    entries unmodified) — render() trusts that precondition rather than
    re-sorting. Pure and synchronous: no I/O happens here.
    """
    chapters = _derive_chapters(entries)

    chapter_for_index: dict[int, int] = {}
    chapter_start_indices: set[int] = set()
    for chapter in chapters:
        chapter_start_indices.add(chapter.start_frame_index)
        for i in range(chapter.start_frame_index, chapter.end_frame_index + 1):
            chapter_for_index[i] = chapter.id

    frames = [
        _frame_from(
            entry,
            index,
            chapter_for_index.get(index, 0),
            is_start=index in chapter_start_indices,
        )
        for index, entry in enumerate(entries)
    ]

    return Replay(
        session_id=session_id,
        generated_at=generated_at,
        frames=frames,
        chapters=chapters,
    )
