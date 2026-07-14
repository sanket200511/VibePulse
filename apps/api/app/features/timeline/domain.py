"""
Timeline domain — pure, framework-free construction of a Session Timeline.

Everything here operates on already-fetched ``AnalyzableEvent`` objects and a
bulk-fetched lookup of persisted analysis findings; it performs no I/O of its
own (that belongs in service.py). See docs/adr/0006-session-timeline.md.

TimelineEntry is deliberately split into ``metadata`` (observed facts) and
``insights`` (interpretive signal sourced from the analysis pipeline) rather
than one generic dict, so future insight providers (Health, AI Fingerprint)
extend ``insights`` without metadata growing without bound.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import StrEnum
from typing import Any

from app.core.domain.events import AnalyzableEvent
from app.features.events.constants import EventType

# Tuning constants for generation heuristics. These shape how entries are
# grouped and where markers are inserted — they are timeline-rendering
# behaviour, not deployment config, so they live here rather than in
# app.core.config.Settings (see docs/adr/0006-session-timeline.md).
GROUP_GAP_SECONDS = 30.0
IDLE_GAP_SECONDS = 120.0

# Only these event types may be folded into a GROUP entry. FILE_CREATED and
# FILE_DELETED always remain distinct entries — collapsing a create/delete
# into a run of modifications would erase a semantically significant
# lifecycle moment (approved refinement #2).
_GROUPABLE_EVENT_TYPES = frozenset({EventType.FILE_MODIFIED.value})


class TimelineEntryKind(StrEnum):
    EVENT = "EVENT"
    GROUP = "GROUP"
    MARKER = "MARKER"


class TimelineMarkerKind(StrEnum):
    SESSION_START = "SESSION_START"
    SESSION_END = "SESSION_END"
    IDLE_GAP = "IDLE_GAP"
    LANGUAGE_SWITCH = "LANGUAGE_SWITCH"


@dataclass(frozen=True)
class TimelineMetadata:
    """
    Structural, observed facts about a timeline entry — what happened, when,
    to which file. Never inferred or interpreted; that belongs in
    TimelineInsights.
    """

    timestamp: datetime
    event_type: str | None
    file_path: str | None
    language: str | None
    git_branch: str | None
    group_size: int
    group_span_seconds: float | None
    member_event_ids: tuple[uuid.UUID, ...]
    marker_kind: TimelineMarkerKind | None
    marker_detail: str | None


@dataclass(frozen=True)
class TimelineInsights:
    """
    Interpretive signal about a timeline entry, sourced from the analysis
    pipeline's persisted findings (``analyzer_name -> findings``). Kept
    separate from TimelineMetadata specifically so future insight providers
    (Health scores, AI Fingerprint likelihoods) extend this shape without
    growing metadata into an unbounded generic dict (approved refinement #1).
    """

    analyzer_findings: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass(frozen=True)
class TimelineEntry:
    """One row in a rendered timeline — an event, a collapsed group, or a marker."""

    id: uuid.UUID
    entry_kind: TimelineEntryKind
    metadata: TimelineMetadata
    insights: TimelineInsights


@dataclass(frozen=True)
class TimelineLargestChange:
    """The file with the most edit activity in the session, if one stands out."""

    file_path: str
    event_count: int


@dataclass(frozen=True)
class TimelineOutcome:
    """
    Session Outcome card data (approved refinement #4) — summarises the whole
    session rather than narrating it entry-by-entry.

    ``largest_change`` is a proxy (the most-edited file by event count), not a
    line-diff size — VibePulse never reads file content, so a content-based
    "largest change" cannot be derived truthfully. It is ``None`` when no file
    was edited more than once, i.e. when the signal isn't meaningfully
    derivable rather than inventing one.

    ``session_summary`` passes through the same raw dict already stored on
    ``Session.summary`` (produced by SessionSummaryGenerator) — it is ``None``
    for sessions that have not yet completed.
    """

    duration_seconds: float
    event_count: int
    distinct_file_count: int
    primary_language: str | None
    languages: dict[str, int]
    largest_change: TimelineLargestChange | None
    session_summary: dict[str, Any] | None


@dataclass(frozen=True)
class Timeline:
    """Full render() output: chronologically ordered entries plus the Outcome card."""

    entries: list[TimelineEntry]
    outcome: TimelineOutcome


@dataclass
class _GroupAccumulator:
    """Internal, mutable accumulator folded into a single TimelineEntry by render(). Not exposed."""

    first: AnalyzableEvent
    last: AnalyzableEvent
    member_ids: list[uuid.UUID]
    analyzer_findings: dict[str, dict[str, Any]]


def _findings_for(
    event_id: uuid.UUID, analyses: dict[uuid.UUID, dict[str, dict[str, Any]]]
) -> dict[str, dict[str, Any]]:
    return analyses.get(event_id, {})


def _is_groupable(event: AnalyzableEvent) -> bool:
    return event.event_type in _GROUPABLE_EVENT_TYPES


def _group_entry(group: _GroupAccumulator) -> TimelineEntry:
    span_seconds = (group.last.timestamp - group.first.timestamp).total_seconds()
    return TimelineEntry(
        id=group.first.id,
        entry_kind=TimelineEntryKind.GROUP,
        metadata=TimelineMetadata(
            timestamp=group.first.timestamp,
            event_type=group.first.event_type,
            file_path=group.first.file_path,
            language=group.last.language,
            git_branch=group.last.git_branch,
            group_size=len(group.member_ids),
            group_span_seconds=span_seconds,
            member_event_ids=tuple(group.member_ids),
            marker_kind=None,
            marker_detail=None,
        ),
        insights=TimelineInsights(analyzer_findings=group.analyzer_findings),
    )


def _marker_entry(
    *, timestamp: datetime, kind: TimelineMarkerKind, detail: str | None
) -> TimelineEntry:
    return TimelineEntry(
        id=uuid.uuid4(),
        entry_kind=TimelineEntryKind.MARKER,
        metadata=TimelineMetadata(
            timestamp=timestamp,
            event_type=None,
            file_path=None,
            language=None,
            git_branch=None,
            group_size=0,
            group_span_seconds=None,
            member_event_ids=(),
            marker_kind=kind,
            marker_detail=detail,
        ),
        insights=TimelineInsights(),
    )


def _singleton_entry(group: _GroupAccumulator) -> TimelineEntry:
    return TimelineEntry(
        id=group.first.id,
        entry_kind=TimelineEntryKind.EVENT,
        metadata=TimelineMetadata(
            timestamp=group.first.timestamp,
            event_type=group.first.event_type,
            file_path=group.first.file_path,
            language=group.first.language,
            git_branch=group.first.git_branch,
            group_size=1,
            group_span_seconds=None,
            member_event_ids=(group.first.id,),
            marker_kind=None,
            marker_detail=None,
        ),
        insights=TimelineInsights(analyzer_findings=group.analyzer_findings),
    )


def _flush_group(entries: list[TimelineEntry], group: _GroupAccumulator | None) -> None:
    if group is None:
        return
    if len(group.member_ids) == 1:
        entries.append(_singleton_entry(group))
    else:
        entries.append(_group_entry(group))


def _group_events(
    events: list[AnalyzableEvent],
    analyses: dict[uuid.UUID, dict[str, dict[str, Any]]],
) -> list[TimelineEntry]:
    """
    Fold consecutive groupable events on the same file into GROUP entries.

    Only FILE_MODIFIED events on the same file, within GROUP_GAP_SECONDS of
    the previous one, are grouped. FILE_CREATED/FILE_DELETED events, a
    different file, or a gap wider than the threshold, always start a fresh
    entry — preserving the semantic distinctness required by refinement #2.
    """
    entries: list[TimelineEntry] = []
    active: _GroupAccumulator | None = None

    for event in events:
        findings = _findings_for(event.id, analyses)
        can_extend = (
            active is not None
            and _is_groupable(event)
            and _is_groupable(active.last)
            and active.last.file_path == event.file_path
            and (event.timestamp - active.last.timestamp).total_seconds() <= GROUP_GAP_SECONDS
        )
        if can_extend:
            assert active is not None  # narrowed by can_extend
            active.last = event
            active.member_ids.append(event.id)
            active.analyzer_findings.update(findings)
            continue

        _flush_group(entries, active)
        active = _GroupAccumulator(
            first=event, last=event, member_ids=[event.id], analyzer_findings=dict(findings)
        )

    _flush_group(entries, active)
    return entries


def _top_key(counts: dict[str, int]) -> str | None:
    if not counts:
        return None
    return max(counts.items(), key=lambda item: item[1])[0]


def _compute_outcome(
    *,
    events: list[AnalyzableEvent],
    session_started_at: datetime,
    session_ended_at: datetime | None,
    session_summary: dict[str, Any] | None,
) -> TimelineOutcome:
    end_reference = session_ended_at or (events[-1].timestamp if events else session_started_at)
    duration_seconds = max((end_reference - session_started_at).total_seconds(), 0.0)

    languages: dict[str, int] = {}
    files: dict[str, int] = {}
    for event in events:
        if event.language:
            languages[event.language] = languages.get(event.language, 0) + 1
        if event.file_path:
            files[event.file_path] = files.get(event.file_path, 0) + 1

    largest_change: TimelineLargestChange | None = None
    if files:
        top_file, top_count = max(files.items(), key=lambda item: item[1])
        if top_count > 1:
            largest_change = TimelineLargestChange(file_path=top_file, event_count=top_count)

    return TimelineOutcome(
        duration_seconds=duration_seconds,
        event_count=len(events),
        distinct_file_count=len(files),
        primary_language=_top_key(languages),
        languages=languages,
        largest_change=largest_change,
        session_summary=session_summary,
    )


def _entry_end(entry: TimelineEntry) -> datetime:
    if entry.metadata.group_span_seconds is None:
        return entry.metadata.timestamp
    return entry.metadata.timestamp + timedelta(seconds=entry.metadata.group_span_seconds)


def render(
    events: list[AnalyzableEvent],
    analyses: dict[uuid.UUID, dict[str, dict[str, Any]]],
    *,
    session_started_at: datetime,
    session_ended_at: datetime | None,
    session_summary: dict[str, Any] | None,
) -> Timeline:
    """
    Build the ordered timeline entries plus the Session Outcome for a session.

    ``events`` must already be sorted by timestamp ascending (the caller,
    TimelineService, guarantees this via its query's ORDER BY) — render()
    trusts that precondition rather than re-sorting. Pure and synchronous:
    no I/O happens here.
    """
    grouped = _group_events(events, analyses)

    entries: list[TimelineEntry] = [
        _marker_entry(
            timestamp=session_started_at, kind=TimelineMarkerKind.SESSION_START, detail=None
        )
    ]

    previous_entry_end = session_started_at
    previous_language: str | None = None

    for entry in grouped:
        gap_seconds = (entry.metadata.timestamp - previous_entry_end).total_seconds()
        if gap_seconds >= IDLE_GAP_SECONDS:
            entries.append(
                _marker_entry(
                    timestamp=previous_entry_end,
                    kind=TimelineMarkerKind.IDLE_GAP,
                    detail=f"{round(gap_seconds)}s idle",
                )
            )

        if (
            entry.metadata.language is not None
            and previous_language is not None
            and entry.metadata.language != previous_language
        ):
            entries.append(
                _marker_entry(
                    timestamp=entry.metadata.timestamp,
                    kind=TimelineMarkerKind.LANGUAGE_SWITCH,
                    detail=f"{previous_language} -> {entry.metadata.language}",
                )
            )

        entries.append(entry)
        previous_entry_end = _entry_end(entry)
        if entry.metadata.language is not None:
            previous_language = entry.metadata.language

    if session_ended_at is not None:
        entries.append(
            _marker_entry(
                timestamp=session_ended_at, kind=TimelineMarkerKind.SESSION_END, detail=None
            )
        )

    outcome = _compute_outcome(
        events=events,
        session_started_at=session_started_at,
        session_ended_at=session_ended_at,
        session_summary=session_summary,
    )

    return Timeline(entries=entries, outcome=outcome)
