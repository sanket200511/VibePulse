"""
Developer Intelligence Engine domain — pure, framework-free insight generation.

Consumes an already-rendered Timeline (see timeline/domain.py) and produces a
SessionProfile: deterministic, rule-based DeveloperInsights grouped by
category. No AI/LLM/statistical model is used anywhere in this module —
every insight is produced by a plain rule (bucketing, tallying, threshold
comparison) over data the system already observed. See
docs/adr/0007-developer-intelligence-engine.md.

Insights are deliberately built from Timeline's entries/outcome rather than
re-fetching or re-deriving events, so grouping/marker business rules
(semantic grouping, idle-gap threshold, language-switch detection) are never
duplicated here.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any, Protocol, runtime_checkable

from app.features.sessions.constants import SessionStatus
from app.features.timeline.domain import (
    TimelineEntry,
    TimelineEntryKind,
    TimelineMarkerKind,
    TimelineOutcome,
)

# Tuning constants for generator heuristics -- insight-generation behaviour,
# not deployment config (mirrors timeline/domain.py's GROUP_GAP_SECONDS).
ACTIVITY_BUCKET_SECONDS = 300.0
TOP_FILES_LIMIT = 5
ITERATIVE_REFINEMENT_MIN_GROUP_SIZE = 3
CREATION_BURST_MIN_COUNT = 3
CLEANUP_PASS_MIN_COUNT = 2
BROAD_SWEEP_MIN_FILES = 5
BROAD_SWEEP_WINDOW_SECONDS = 600.0
POLYGLOT_MIN_SHARE = 0.10


class InsightCategory(StrEnum):
    ACTIVITY = "ACTIVITY"
    FILES = "FILES"
    DIRECTORIES = "DIRECTORIES"
    LANGUAGES = "LANGUAGES"
    DEVELOPMENT_PATTERNS = "DEVELOPMENT_PATTERNS"
    SESSION_STATISTICS = "SESSION_STATISTICS"
    CONTEXT_SWITCHING = "CONTEXT_SWITCHING"
    IDLE_BEHAVIOUR = "IDLE_BEHAVIOUR"


@dataclass(frozen=True)
class DeveloperInsight:
    """
    One narrative finding produced by a single InsightGenerator.

    ``headline`` / ``evidence`` are the human-facing narrative surface;
    ``metrics`` is a structured bag for machine consumers (Replay, Health, AI
    Fingerprint) that never needs parsing to read the story (approved
    refinement #2, docs/adr/0007-developer-intelligence-engine.md).
    """

    id: uuid.UUID
    category: InsightCategory
    generator_name: str
    generator_version: int
    headline: str
    evidence: str | None
    metrics: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SessionProfileInput:
    """
    All pre-fetched data an InsightGenerator may need, built once by
    insights/service.py from Timeline + Session and passed to every
    generator -- mirrors AnalysisContext's role for analyzers.
    """

    entries: list[TimelineEntry]
    outcome: TimelineOutcome
    session_status: SessionStatus
    project_root: str
    git_branch: str | None


@dataclass(frozen=True)
class SessionProfile:
    """
    Full Developer Intelligence Engine output for a session: DeveloperInsights
    grouped by category. A category is only present as a key when at least
    one generator actually produced an insight for it -- an empty category
    is simply absent, not present with an empty list.
    """

    session_id: uuid.UUID
    generated_at: datetime
    categories: dict[InsightCategory, list[DeveloperInsight]] = field(default_factory=dict)


@runtime_checkable
class InsightGenerator(Protocol):
    """
    Contract every insight generator must satisfy. Mirrors the Analyzer
    Protocol (analysis/base.py) exactly -- plain classes, no base class
    required, as long as the attributes and generate() method are present.

    Attribute semantics
    -------------------
    name        Stable snake_case identifier.
    version     Increment when the insight/metrics schema changes.
    category    The InsightCategory this generator produces.
    description Human-readable summary.
    priority    Execution order; lower numbers run first.
    enabled     When False the engine skips this generator entirely.
    """

    name: str
    version: int
    category: InsightCategory
    description: str
    priority: int
    enabled: bool

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        """
        Inspect the profile input and return zero or more insights.

        Must be synchronous and free of side effects. Raising is safe -- the
        engine catches it, logs it, and continues with the next generator.
        """
        ...


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _content_entries(entries: list[TimelineEntry]) -> list[TimelineEntry]:
    return [e for e in entries if e.entry_kind != TimelineEntryKind.MARKER]


def _directory_of(file_path: str) -> str:
    if "/" in file_path:
        return file_path.rsplit("/", 1)[0]
    return ""


def _new_insight(
    *,
    category: InsightCategory,
    generator_name: str,
    generator_version: int,
    headline: str,
    evidence: str | None,
    metrics: dict[str, Any] | None = None,
) -> DeveloperInsight:
    return DeveloperInsight(
        id=uuid.uuid4(),
        category=category,
        generator_name=generator_name,
        generator_version=generator_version,
        headline=headline,
        evidence=evidence,
        metrics=metrics or {},
    )


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------


class ActivityInsightGenerator:
    """Summarises event volume, pace, and the busiest window of the session."""

    name = "activity"
    version = 1
    category = InsightCategory.ACTIVITY
    description = "Event volume, pace, and busiest window."
    priority = 10
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        outcome = profile_input.outcome
        if outcome.event_count == 0:
            return []

        duration_minutes = outcome.duration_seconds / 60.0
        rate = (
            outcome.event_count / duration_minutes
            if duration_minutes > 0
            else float(outcome.event_count)
        )

        buckets: dict[int, int] = {}
        event_type_counts: dict[str, int] = {}
        content = _content_entries(profile_input.entries)
        session_start = content[0].metadata.timestamp if content else None

        for entry in content:
            weight = entry.metadata.group_size
            if session_start is not None:
                offset = (entry.metadata.timestamp - session_start).total_seconds()
                bucket = int(offset // ACTIVITY_BUCKET_SECONDS)
                buckets[bucket] = buckets.get(bucket, 0) + weight
            if entry.metadata.event_type is not None:
                event_type_counts[entry.metadata.event_type] = (
                    event_type_counts.get(entry.metadata.event_type, 0) + weight
                )

        evidence: str | None = None
        busiest_start_seconds = 0.0
        busiest_count = 0
        if buckets:
            busiest_bucket, busiest_count = max(buckets.items(), key=lambda kv: kv[1])
            busiest_start_seconds = busiest_bucket * ACTIVITY_BUCKET_SECONDS
            evidence = (
                f"Busiest window: {round(busiest_start_seconds / 60)}-"
                f"{round((busiest_start_seconds + ACTIVITY_BUCKET_SECONDS) / 60)} min in, "
                f"with {busiest_count} events."
            )

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"{outcome.event_count} events at an average of {rate:.1f}/min",
                evidence=evidence,
                metrics={
                    "events_per_minute": round(rate, 2),
                    "busiest_window_start_seconds": busiest_start_seconds,
                    "busiest_window_event_count": busiest_count,
                    "event_type_counts": event_type_counts,
                },
            )
        ]


class FilesInsightGenerator:
    """Identifies the most-touched file and ranks file activity."""

    name = "files"
    version = 1
    category = InsightCategory.FILES
    description = "Most-active file and top-N file activity ranking."
    priority = 20
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        counts: dict[str, int] = {}
        for entry in _content_entries(profile_input.entries):
            if entry.metadata.file_path is None:
                continue
            counts[entry.metadata.file_path] = (
                counts.get(entry.metadata.file_path, 0) + entry.metadata.group_size
            )

        if not counts:
            return []

        ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        top_path, top_count = ranked[0]
        top_files = [
            {"file_path": path, "event_count": count} for path, count in ranked[:TOP_FILES_LIMIT]
        ]

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"Most active file: {top_path} ({top_count} edits)",
                evidence=(
                    f"{len(counts)} distinct files touched this session."
                    if len(counts) > 1
                    else "Only one file was touched this session."
                ),
                metrics={"top_files": top_files},
            )
        ]


class DirectoriesInsightGenerator:
    """Identifies which directory received the most activity."""

    name = "directories"
    version = 1
    category = InsightCategory.DIRECTORIES
    description = "Most-active directory by edit count."
    priority = 30
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        counts: dict[str, int] = {}
        files_by_directory: dict[str, set[str]] = {}
        for entry in _content_entries(profile_input.entries):
            if entry.metadata.file_path is None:
                continue
            directory = _directory_of(entry.metadata.file_path)
            counts[directory] = counts.get(directory, 0) + entry.metadata.group_size
            files_by_directory.setdefault(directory, set()).add(entry.metadata.file_path)

        if not counts:
            return []

        top_directory, top_count = max(counts.items(), key=lambda kv: kv[1])
        file_count = len(files_by_directory[top_directory])

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"Most active directory: {top_directory or '/'} ({top_count} edits)",
                evidence=f"{file_count} file(s) touched here.",
                metrics={"directory_counts": counts},
            )
        ]


class LanguagesInsightGenerator:
    """Summarises language share and detects polyglot sessions."""

    name = "languages"
    version = 1
    category = InsightCategory.LANGUAGES
    description = "Language share and polyglot detection."
    priority = 40
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        languages = profile_input.outcome.languages
        if not languages:
            return []

        total = sum(languages.values())
        percentages = {lang: round(count / total * 100, 1) for lang, count in languages.items()}
        primary_language = profile_input.outcome.primary_language
        secondary_languages = sorted(
            (
                (lang, pct)
                for lang, pct in percentages.items()
                if lang != primary_language and pct / 100 >= POLYGLOT_MIN_SHARE
            ),
            key=lambda kv: kv[1],
            reverse=True,
        )
        is_polyglot = len(secondary_languages) > 0

        if is_polyglot:
            headline = f"Polyglot session across {len(languages)} languages"
            evidence = "Also touched: " + ", ".join(
                f"{lang} ({pct:.0f}%)" for lang, pct in secondary_languages
            )
        else:
            primary_pct = percentages.get(primary_language, 0.0) if primary_language else 0.0
            headline = f"Primarily {primary_language} ({primary_pct:.0f}% of events)"
            evidence = None

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=headline,
                evidence=evidence,
                metrics={"language_percentages": percentages, "is_polyglot": is_polyglot},
            )
        ]


class DevelopmentPatternsInsightGenerator:
    """
    Detects named development-pattern signatures: iterative refinement,
    creation bursts, cleanup passes, and broad sweeps.
    """

    name = "development_patterns"
    version = 1
    category = InsightCategory.DEVELOPMENT_PATTERNS
    description = "Named development-pattern signature detection."
    priority = 50
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        content = _content_entries(profile_input.entries)
        insights: list[DeveloperInsight] = []

        insights.extend(self._iterative_refinement(content))
        insights.extend(self._creation_burst(content))
        insights.extend(self._cleanup_pass(content))
        broad_sweep = self._broad_sweep(content)
        if broad_sweep is not None:
            insights.append(broad_sweep)

        return insights

    def _iterative_refinement(self, content: list[TimelineEntry]) -> list[DeveloperInsight]:
        refined = [
            entry
            for entry in content
            if entry.entry_kind == TimelineEntryKind.GROUP
            and entry.metadata.group_size >= ITERATIVE_REFINEMENT_MIN_GROUP_SIZE
        ]
        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"Iterative refinement on {entry.metadata.file_path}",
                evidence=f"{entry.metadata.group_size} consecutive edits in one sitting.",
                metrics={
                    "file_path": entry.metadata.file_path,
                    "edit_count": entry.metadata.group_size,
                },
            )
            for entry in refined
        ]

    def _creation_burst(self, content: list[TimelineEntry]) -> list[DeveloperInsight]:
        bursts = self._consecutive_runs(content, "FILE_CREATED", CREATION_BURST_MIN_COUNT)
        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"Creation burst -- {len(run)} files scaffolded in quick succession",
                evidence=", ".join(e.metadata.file_path or "?" for e in run),
                metrics={"file_paths": [e.metadata.file_path for e in run], "count": len(run)},
            )
            for run in bursts
        ]

    def _cleanup_pass(self, content: list[TimelineEntry]) -> list[DeveloperInsight]:
        runs = self._consecutive_runs(content, "FILE_DELETED", CLEANUP_PASS_MIN_COUNT)
        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"Cleanup pass -- {len(run)} files removed",
                evidence=", ".join(e.metadata.file_path or "?" for e in run),
                metrics={"file_paths": [e.metadata.file_path for e in run], "count": len(run)},
            )
            for run in runs
        ]

    @staticmethod
    def _consecutive_runs(
        content: list[TimelineEntry], event_type: str, min_length: int
    ) -> list[list[TimelineEntry]]:
        runs: list[list[TimelineEntry]] = []
        current: list[TimelineEntry] = []
        for entry in content:
            if entry.metadata.event_type == event_type:
                current.append(entry)
                continue
            if len(current) >= min_length:
                runs.append(current)
            current = []
        if len(current) >= min_length:
            runs.append(current)
        return runs

    def _broad_sweep(self, content: list[TimelineEntry]) -> DeveloperInsight | None:
        singleton_touches = [
            entry
            for entry in content
            if entry.entry_kind == TimelineEntryKind.EVENT and entry.metadata.group_size == 1
        ]
        window: list[TimelineEntry] = []
        for entry in singleton_touches:
            window.append(entry)
            while (
                len(window) > 1
                and (entry.metadata.timestamp - window[0].metadata.timestamp).total_seconds()
                > BROAD_SWEEP_WINDOW_SECONDS
            ):
                window.pop(0)
            if len(window) >= BROAD_SWEEP_MIN_FILES:
                span_minutes = (
                    entry.metadata.timestamp - window[0].metadata.timestamp
                ).total_seconds() / 60.0
                return _new_insight(
                    category=self.category,
                    generator_name=self.name,
                    generator_version=self.version,
                    headline=(
                        f"Broad sweep -- {len(window)} files touched once each within "
                        f"{span_minutes:.1f} min"
                    ),
                    evidence=", ".join(e.metadata.file_path or "?" for e in window),
                    metrics={
                        "file_paths": [e.metadata.file_path for e in window],
                        "window_minutes": round(span_minutes, 1),
                    },
                )
        return None


class SessionStatisticsInsightGenerator:
    """Repackages the Session Outcome's core rollup numbers as a narrative insight."""

    name = "session_statistics"
    version = 1
    category = InsightCategory.SESSION_STATISTICS
    description = "Session-level rollup: events, files, duration."
    priority = 60
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        outcome = profile_input.outcome
        if outcome.event_count == 0:
            return []

        duration_minutes = outcome.duration_seconds / 60.0
        average_seconds_per_event = outcome.duration_seconds / outcome.event_count

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=(
                    f"{outcome.event_count} events across {outcome.distinct_file_count} files "
                    f"over {duration_minutes:.1f} min"
                ),
                evidence=f"Average of {average_seconds_per_event:.1f}s between events.",
                metrics={
                    "duration_seconds": outcome.duration_seconds,
                    "event_count": outcome.event_count,
                    "distinct_file_count": outcome.distinct_file_count,
                    "average_seconds_per_event": round(average_seconds_per_event, 2),
                },
            )
        ]


class ContextSwitchingInsightGenerator:
    """Counts directory/language switches and the longest single-file focus streak."""

    name = "context_switching"
    version = 1
    category = InsightCategory.CONTEXT_SWITCHING
    description = "Context-switch frequency and longest focus streak."
    priority = 70
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        content = _content_entries(profile_input.entries)
        if len(content) < 2:
            return []

        switch_count = 0
        longest_streak_file: str | None = None
        longest_streak_length = 0

        previous = content[0]
        current_streak_file = previous.metadata.file_path
        current_streak_length = 1

        for entry in content[1:]:
            same_directory = _directory_of(entry.metadata.file_path or "") == _directory_of(
                previous.metadata.file_path or ""
            )
            same_language = entry.metadata.language == previous.metadata.language
            if not same_directory or not same_language:
                switch_count += 1

            if entry.metadata.file_path == current_streak_file:
                current_streak_length += 1
            else:
                if current_streak_length > longest_streak_length:
                    longest_streak_length = current_streak_length
                    longest_streak_file = current_streak_file
                current_streak_file = entry.metadata.file_path
                current_streak_length = 1

            previous = entry

        if current_streak_length > longest_streak_length:
            longest_streak_length = current_streak_length
            longest_streak_file = current_streak_file

        duration_hours = profile_input.outcome.duration_seconds / 3600.0
        switches_per_hour = (
            switch_count / duration_hours if duration_hours > 0 else float(switch_count)
        )

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"{switch_count} context switches ({switches_per_hour:.1f}/hour)",
                evidence=(
                    f"Longest focus streak: {longest_streak_length} consecutive entries on "
                    f"{longest_streak_file}."
                    if longest_streak_file is not None
                    else None
                ),
                metrics={
                    "switch_count": switch_count,
                    "switches_per_hour": round(switches_per_hour, 2),
                    "longest_streak_file": longest_streak_file,
                    "longest_streak_length": longest_streak_length,
                },
            )
        ]


class IdleBehaviourInsightGenerator:
    """
    Reads Timeline's IDLE_GAP markers to summarise idle time, without
    recomputing its own idle threshold (Timeline already owns that rule).
    """

    name = "idle_behaviour"
    version = 1
    category = InsightCategory.IDLE_BEHAVIOUR
    description = "Idle-gap count and total idle time, sourced from Timeline markers."
    priority = 80
    enabled = True

    def generate(self, profile_input: SessionProfileInput) -> list[DeveloperInsight]:
        entries = profile_input.entries
        idle_seconds: list[float] = []

        for index, entry in enumerate(entries):
            if entry.metadata.marker_kind != TimelineMarkerKind.IDLE_GAP:
                continue
            if index + 1 >= len(entries):
                continue
            next_entry = entries[index + 1]
            gap_seconds = (next_entry.metadata.timestamp - entry.metadata.timestamp).total_seconds()
            idle_seconds.append(gap_seconds)

        if not idle_seconds:
            return [
                _new_insight(
                    category=self.category,
                    generator_name=self.name,
                    generator_version=self.version,
                    headline="No idle gaps detected -- continuous activity throughout the session.",
                    evidence=None,
                    metrics={"idle_gap_count": 0, "total_idle_seconds": 0.0},
                )
            ]

        total_idle = sum(idle_seconds)
        longest_idle = max(idle_seconds)

        return [
            _new_insight(
                category=self.category,
                generator_name=self.name,
                generator_version=self.version,
                headline=f"{len(idle_seconds)} idle gap(s) totalling {total_idle / 60:.1f} min",
                evidence=f"Longest gap: {round(longest_idle)}s.",
                metrics={
                    "idle_gap_count": len(idle_seconds),
                    "total_idle_seconds": round(total_idle, 1),
                    "longest_idle_seconds": round(longest_idle, 1),
                },
            )
        ]
