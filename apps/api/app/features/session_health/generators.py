"""
Health metric generators — one per HealthCategory, each producing exactly
one HealthMetric (or None if the session has insufficient signal).

Every generator computes a raw number (always exposed in ``metrics``), maps
it to a fixed, named threshold band (``label``), and renders a templated
headline from the raw number. No metric is a weighted blend of other
metrics, and no metric compares this session to any other session or
developer. See docs/adr/0009-health-engine.md.
"""

from __future__ import annotations

from statistics import pstdev

from app.features.replay.domain import ChapterKind, ReplayChapter
from app.features.session_health.domain import (
    HealthCategory,
    HealthInput,
    HealthMetric,
    content_entries,
    format_duration,
    idle_chapters,
    new_metric,
    work_chapters,
)
from app.features.timeline.domain import TimelineEntryKind

# Focus
HEALTH_FOCUS_HIGH = 0.80
HEALTH_FOCUS_MODERATE = 0.55
HEALTH_FOCUS_LOW = 0.30

# Momentum
HEALTH_MOMENTUM_STRONG = 0.85
HEALTH_MOMENTUM_STEADY = 0.60
HEALTH_MOMENTUM_CHOPPY = 0.35

# Flow
HEALTH_FLOW_COHERENT = 1.0
HEALTH_FLOW_MODERATE = 3.0
HEALTH_FLOW_FRAGMENTED = 6.0

# Stability
HEALTH_STABILITY_BUCKET_SECONDS = 300.0
HEALTH_STABILITY_STEADY = 0.40
HEALTH_STABILITY_VARIABLE = 0.80

# Completion
HEALTH_COMPLETION_IDLE_THRESHOLD = 60.0


class FocusHealthGenerator:
    """How much of the session was spent in active work, and the longest streak."""

    name = "focus"
    version = 1
    category = HealthCategory.FOCUS
    description = "Proportion of session time spent in active work."
    priority = 10
    enabled = True

    def generate(self, health_input: HealthInput) -> HealthMetric | None:
        outcome = health_input.outcome
        work = work_chapters(health_input.chapters)
        if outcome.duration_seconds <= 0:
            return None

        focus_seconds = sum(c.duration_seconds for c in work)
        focus_ratio = focus_seconds / outcome.duration_seconds
        longest_streak = max((c.duration_seconds for c in work), default=0.0)

        if focus_ratio >= HEALTH_FOCUS_HIGH:
            label = "Highly Focused"
        elif focus_ratio >= HEALTH_FOCUS_MODERATE:
            label = "Focused"
        elif focus_ratio >= HEALTH_FOCUS_LOW:
            label = "Fragmented"
        else:
            label = "Scattered"

        headline = (
            f"{focus_ratio:.0%} of this session was spent in active work, with the longest "
            f"uninterrupted stretch lasting {format_duration(longest_streak)}."
        )

        return new_metric(
            category=self.category,
            generator_name=self.name,
            generator_version=self.version,
            label=label,
            headline=headline,
            evidence=None,
            metrics={
                "focus_ratio": round(focus_ratio, 4),
                "focus_seconds": round(focus_seconds, 1),
                "longest_streak_seconds": round(longest_streak, 1),
            },
        )


def _streaks(chapters: list[ReplayChapter]) -> list[float]:
    """Merge adjacent WORK/RESUMED chapters (no IDLE between them) into streaks."""
    streaks: list[float] = []
    current = 0.0
    in_streak = False
    for chapter in chapters:
        if chapter.kind in (ChapterKind.WORK, ChapterKind.RESUMED):
            current += chapter.duration_seconds
            in_streak = True
        elif chapter.kind == ChapterKind.IDLE:
            if in_streak:
                streaks.append(current)
            current = 0.0
            in_streak = False
        # SESSION_STARTED/SESSION_COMPLETED neither extend nor break a streak.
    if in_streak:
        streaks.append(current)
    return streaks


class MomentumHealthGenerator:
    """How much uninterrupted work occurred, independent of total focus ratio."""

    name = "momentum"
    version = 1
    category = HealthCategory.MOMENTUM
    description = "Shape of work streaks: long uninterrupted stretches vs. choppy ones."
    priority = 20
    enabled = True

    def generate(self, health_input: HealthInput) -> HealthMetric | None:
        streaks = _streaks(health_input.chapters)
        if not streaks:
            return None

        idle = idle_chapters(health_input.chapters)
        avg_streak_seconds = sum(streaks) / len(streaks)
        avg_idle_seconds = sum(c.duration_seconds for c in idle) / len(idle) if idle else 0.0
        interruption_count = len(idle)

        if avg_streak_seconds + avg_idle_seconds <= 0:
            momentum_index = 1.0
        else:
            momentum_index = avg_streak_seconds / (avg_streak_seconds + avg_idle_seconds)

        if momentum_index >= HEALTH_MOMENTUM_STRONG:
            label = "Strong Momentum"
        elif momentum_index >= HEALTH_MOMENTUM_STEADY:
            label = "Steady Momentum"
        elif momentum_index >= HEALTH_MOMENTUM_CHOPPY:
            label = "Choppy"
        else:
            label = "Frequently Interrupted"

        headline = (
            f"Work happened in {len(streaks)} uninterrupted stretch(es) averaging "
            f"{format_duration(avg_streak_seconds)}, broken up by {interruption_count} idle "
            "period(s)."
        )

        return new_metric(
            category=self.category,
            generator_name=self.name,
            generator_version=self.version,
            label=label,
            headline=headline,
            evidence=None,
            metrics={
                "momentum_index": round(momentum_index, 4),
                "streak_count": len(streaks),
                "avg_streak_seconds": round(avg_streak_seconds, 1),
                "avg_idle_seconds": round(avg_idle_seconds, 1),
                "interruption_count": interruption_count,
            },
        )


class FlowHealthGenerator:
    """How coherent the session was, measured by context-shifts between work areas."""

    name = "flow"
    version = 1
    category = HealthCategory.FLOW
    description = "Context-shift frequency between distinct areas of work."
    priority = 30
    enabled = True

    def generate(self, health_input: HealthInput) -> HealthMetric | None:
        outcome = health_input.outcome
        work = [c for c in health_input.chapters if c.kind == ChapterKind.WORK]
        if not work or outcome.duration_seconds <= 0:
            return None

        topic_shift_count = max(len(work) - 1, 0)
        duration_hours = outcome.duration_seconds / 3600.0
        shifts_per_hour = topic_shift_count / duration_hours if duration_hours > 0 else 0.0

        if shifts_per_hour <= HEALTH_FLOW_COHERENT:
            label = "Highly Coherent"
        elif shifts_per_hour <= HEALTH_FLOW_MODERATE:
            label = "Coherent"
        elif shifts_per_hour <= HEALTH_FLOW_FRAGMENTED:
            label = "Fragmented Focus"
        else:
            label = "Scattered Across Topics"

        headline = (
            f"This session touched {len(work)} distinct area(s) of work, shifting context "
            f"{topic_shift_count} time(s) ({shifts_per_hour:.1f}/hr)."
        )

        return new_metric(
            category=self.category,
            generator_name=self.name,
            generator_version=self.version,
            label=label,
            headline=headline,
            evidence=None,
            metrics={
                "topic_shift_count": topic_shift_count,
                "work_chapter_count": len(work),
                "shifts_per_hour": round(shifts_per_hour, 2),
            },
        )


class StabilityHealthGenerator:
    """How steady the editing cadence was, independent of total volume."""

    name = "stability"
    version = 1
    category = HealthCategory.STABILITY
    description = "Cadence consistency of editing activity during active work."
    priority = 40
    enabled = True

    def generate(self, health_input: HealthInput) -> HealthMetric | None:
        work_ranges = [
            (c.start_timestamp, c.end_timestamp) for c in work_chapters(health_input.chapters)
        ]
        if not work_ranges:
            return None

        buckets: dict[tuple[int, int], int] = {}
        for entry in content_entries(health_input.entries):
            if entry.entry_kind not in (TimelineEntryKind.EVENT, TimelineEntryKind.GROUP):
                continue
            timestamp = entry.metadata.timestamp
            for range_index, (start, end) in enumerate(work_ranges):
                if start <= timestamp <= end:
                    offset = (timestamp - start).total_seconds()
                    bucket_index = int(offset // HEALTH_STABILITY_BUCKET_SECONDS)
                    key = (range_index, bucket_index)
                    buckets[key] = buckets.get(key, 0) + entry.metadata.group_size
                    break

        bucket_counts = list(buckets.values())
        if len(bucket_counts) < 2:
            return None

        mean = sum(bucket_counts) / len(bucket_counts)
        stdev = pstdev(bucket_counts)
        cv = stdev / mean if mean > 0 else 0.0

        if cv <= HEALTH_STABILITY_STEADY:
            label = "Steady Pace"
        elif cv <= HEALTH_STABILITY_VARIABLE:
            label = "Variable Pace"
        else:
            label = "Erratic Pace"

        headline = (
            f"Editing pace was {label.lower()} across the session, with {mean:.1f} events per "
            f"5-minute window on average (±{stdev:.1f})."
        )

        return new_metric(
            category=self.category,
            generator_name=self.name,
            generator_version=self.version,
            label=label,
            headline=headline,
            evidence=None,
            metrics={
                "coefficient_of_variation": round(cv, 4),
                "bucket_count": len(bucket_counts),
                "mean_events_per_bucket": round(mean, 2),
                "stdev_events_per_bucket": round(stdev, 2),
            },
        )


class CompletionHealthGenerator:
    """Whether the session concluded naturally, mid-work, or immediately."""

    name = "completion"
    version = 1
    category = HealthCategory.COMPLETION
    description = "Shape of the session's ending, from the chapter preceding completion."
    priority = 50
    enabled = True

    def generate(self, health_input: HealthInput) -> HealthMetric | None:
        chapters = health_input.chapters
        completed = [c for c in chapters if c.kind == ChapterKind.SESSION_COMPLETED]
        if not completed:
            return None

        terminal = min(completed, key=lambda c: c.start_frame_index)
        preceding_candidates = [
            c for c in chapters if c.end_frame_index < terminal.start_frame_index
        ]
        if not preceding_candidates:
            return None

        preceding = max(preceding_candidates, key=lambda c: c.end_frame_index)

        if (
            preceding.kind == ChapterKind.IDLE
            and preceding.duration_seconds >= HEALTH_COMPLETION_IDLE_THRESHOLD
        ):
            label = "Natural Wind-down"
            headline = "The session wound down naturally — activity tapered off before it ended."
        elif preceding.kind in (ChapterKind.WORK, ChapterKind.RESUMED):
            label = "Concluded Mid-Work"
            headline = "The session ended right after active work, with no wind-down period."
        else:
            label = "Ended Immediately"
            headline = (
                "The session ended shortly after starting, with little or no recorded activity."
            )

        return new_metric(
            category=self.category,
            generator_name=self.name,
            generator_version=self.version,
            label=label,
            headline=headline,
            evidence=None,
            metrics={
                "preceding_chapter_kind": preceding.kind.value,
                "preceding_chapter_duration_seconds": round(preceding.duration_seconds, 1),
            },
        )
