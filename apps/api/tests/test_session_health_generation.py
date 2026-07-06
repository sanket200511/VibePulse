"""
Unit tests for the Session Health Engine's rule-based generators and its
orchestration (build_health_report / derive_guidance).

Each generator is exercised directly against a hand-built HealthInput --
synthetic TimelineOutcome/TimelineEntry/ReplayChapter fixtures, no database,
no Timeline/Replay render() pipeline dependency. Mirrors the style of
test_insights_generation.py, but builds fixtures by hand rather than via
timeline.domain.render() since Health's inputs (chapter kinds/durations,
bucket group_size) are easier to control directly than to coax out of the
full event pipeline.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.features.replay.domain import ChapterKind, ReplayChapter
from app.features.session_health.domain import (
    HealthCategory,
    HealthInput,
    HealthMetric,
)
from app.features.session_health.engine import build_health_report, derive_guidance
from app.features.session_health.generators import (
    CompletionHealthGenerator,
    FlowHealthGenerator,
    FocusHealthGenerator,
    MomentumHealthGenerator,
    StabilityHealthGenerator,
)
from app.features.session_health.registry import HEALTH_GENERATORS
from app.features.timeline.domain import (
    TimelineEntry,
    TimelineEntryKind,
    TimelineInsights,
    TimelineMetadata,
    TimelineOutcome,
)

BASE_TIME = datetime(2026, 7, 1, 12, 0, 0, tzinfo=UTC)


def _outcome(duration_seconds: float) -> TimelineOutcome:
    return TimelineOutcome(
        duration_seconds=duration_seconds,
        event_count=0,
        distinct_file_count=0,
        primary_language=None,
        languages={},
        largest_change=None,
        session_summary=None,
    )


def _chapter(
    chapter_id: int,
    kind: ChapterKind,
    *,
    start_frame_index: int,
    end_frame_index: int,
    start_offset_seconds: float = 0.0,
    duration_seconds: float = 0.0,
) -> ReplayChapter:
    start_timestamp = BASE_TIME + timedelta(seconds=start_offset_seconds)
    return ReplayChapter(
        id=chapter_id,
        label="Test Chapter",
        kind=kind,
        start_frame_index=start_frame_index,
        end_frame_index=end_frame_index,
        start_timestamp=start_timestamp,
        end_timestamp=start_timestamp + timedelta(seconds=duration_seconds),
        duration_seconds=duration_seconds,
    )


def _entry(offset_seconds: float, *, group_size: int = 1) -> TimelineEntry:
    return TimelineEntry(
        id=uuid.uuid4(),
        entry_kind=TimelineEntryKind.EVENT if group_size == 1 else TimelineEntryKind.GROUP,
        metadata=TimelineMetadata(
            timestamp=BASE_TIME + timedelta(seconds=offset_seconds),
            event_type="FILE_MODIFIED",
            file_path="/repo/a.py",
            language="python",
            git_branch="main",
            group_size=group_size,
            group_span_seconds=None,
            member_event_ids=(),
            marker_kind=None,
            marker_detail=None,
        ),
        insights=TimelineInsights(),
    )


def _health_input(
    *,
    duration_seconds: float = 0.0,
    chapters: list[ReplayChapter] | None = None,
    entries: list[TimelineEntry] | None = None,
) -> HealthInput:
    return HealthInput(
        outcome=_outcome(duration_seconds),
        chapters=chapters or [],
        entries=entries or [],
    )


class TestFocusHealthGenerator:
    def test_returns_none_for_zero_duration(self) -> None:
        health_input = _health_input(duration_seconds=0.0, chapters=[])
        assert FocusHealthGenerator().generate(health_input) is None

    def test_highly_focused_label(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        metric = FocusHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Highly Focused"
        assert metric.metrics["focus_ratio"] == 1.0

    def test_focused_label(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=60.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        metric = FocusHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Focused"

    def test_fragmented_label(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=40.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        metric = FocusHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Fragmented"

    def test_scattered_label(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=10.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        metric = FocusHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Scattered"


class TestMomentumHealthGenerator:
    def test_returns_none_when_no_streaks(self) -> None:
        chapters = [
            _chapter(0, ChapterKind.SESSION_STARTED, start_frame_index=0, end_frame_index=0)
        ]
        health_input = _health_input(chapters=chapters)

        assert MomentumHealthGenerator().generate(health_input) is None

    def test_strong_momentum_with_no_idle(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        health_input = _health_input(chapters=chapters)

        metric = MomentumHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Strong Momentum"
        assert metric.metrics["momentum_index"] == 1.0

    def test_steady_momentum(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=70.0
            ),
            _chapter(
                1, ChapterKind.IDLE, start_frame_index=1, end_frame_index=1, duration_seconds=30.0
            ),
        ]
        health_input = _health_input(chapters=chapters)

        metric = MomentumHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Steady Momentum"

    def test_frequently_interrupted(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=5.0
            ),
            _chapter(
                1, ChapterKind.IDLE, start_frame_index=1, end_frame_index=1, duration_seconds=50.0
            ),
            _chapter(
                2, ChapterKind.RESUMED, start_frame_index=2, end_frame_index=2, duration_seconds=5.0
            ),
            _chapter(
                3, ChapterKind.IDLE, start_frame_index=3, end_frame_index=3, duration_seconds=50.0
            ),
        ]
        health_input = _health_input(chapters=chapters)

        metric = MomentumHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Frequently Interrupted"
        assert metric.metrics["interruption_count"] == 2


class TestFlowHealthGenerator:
    def test_returns_none_when_no_work_chapters(self) -> None:
        health_input = _health_input(duration_seconds=100.0, chapters=[])
        assert FlowHealthGenerator().generate(health_input) is None

    def test_highly_coherent_single_work_chapter(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        health_input = _health_input(duration_seconds=3600.0, chapters=chapters)

        metric = FlowHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Highly Coherent"
        assert metric.metrics["topic_shift_count"] == 0

    def test_coherent_label(self) -> None:
        chapters = [
            _chapter(i, ChapterKind.WORK, start_frame_index=i, end_frame_index=i) for i in range(3)
        ]
        health_input = _health_input(duration_seconds=3600.0, chapters=chapters)

        metric = FlowHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Coherent"

    def test_scattered_across_topics(self) -> None:
        chapters = [
            _chapter(i, ChapterKind.WORK, start_frame_index=i, end_frame_index=i) for i in range(8)
        ]
        health_input = _health_input(duration_seconds=60.0, chapters=chapters)

        metric = FlowHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Scattered Across Topics"


class TestStabilityHealthGenerator:
    def test_returns_none_for_fewer_than_two_buckets(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        entries = [_entry(0), _entry(10), _entry(20)]
        health_input = _health_input(chapters=chapters, entries=entries)

        assert StabilityHealthGenerator().generate(health_input) is None

    def test_steady_pace(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=900.0
            )
        ]
        offsets = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840]
        entries = [_entry(offset) for offset in offsets]
        health_input = _health_input(chapters=chapters, entries=entries)

        metric = StabilityHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Steady Pace"
        assert metric.metrics["bucket_count"] == 3

    def test_erratic_pace(self) -> None:
        chapters = [
            _chapter(
                0,
                ChapterKind.WORK,
                start_frame_index=0,
                end_frame_index=0,
                start_offset_seconds=0.0,
                duration_seconds=100.0,
            ),
            _chapter(
                1,
                ChapterKind.RESUMED,
                start_frame_index=1,
                end_frame_index=1,
                start_offset_seconds=300.0,
                duration_seconds=100.0,
            ),
            _chapter(
                2,
                ChapterKind.RESUMED,
                start_frame_index=2,
                end_frame_index=2,
                start_offset_seconds=600.0,
                duration_seconds=100.0,
            ),
        ]
        entries = [
            _entry(50, group_size=1),
            _entry(350, group_size=10),
            _entry(650, group_size=1),
        ]
        health_input = _health_input(chapters=chapters, entries=entries)

        metric = StabilityHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Erratic Pace"
        assert metric.metrics["bucket_count"] == 3


class TestCompletionHealthGenerator:
    def test_returns_none_when_no_completed_chapter(self) -> None:
        chapters = [_chapter(0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0)]
        health_input = _health_input(chapters=chapters)

        assert CompletionHealthGenerator().generate(health_input) is None

    def test_returns_none_when_no_preceding_candidate(self) -> None:
        chapters = [
            _chapter(0, ChapterKind.SESSION_COMPLETED, start_frame_index=0, end_frame_index=0)
        ]
        health_input = _health_input(chapters=chapters)

        assert CompletionHealthGenerator().generate(health_input) is None

    def test_natural_wind_down(self) -> None:
        chapters = [
            _chapter(0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0),
            _chapter(
                1, ChapterKind.IDLE, start_frame_index=1, end_frame_index=1, duration_seconds=120.0
            ),
            _chapter(2, ChapterKind.SESSION_COMPLETED, start_frame_index=2, end_frame_index=2),
        ]
        health_input = _health_input(chapters=chapters)

        metric = CompletionHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Natural Wind-down"

    def test_concluded_mid_work(self) -> None:
        chapters = [
            _chapter(0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0),
            _chapter(1, ChapterKind.SESSION_COMPLETED, start_frame_index=1, end_frame_index=1),
        ]
        health_input = _health_input(chapters=chapters)

        metric = CompletionHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Concluded Mid-Work"

    def test_ended_immediately(self) -> None:
        chapters = [
            _chapter(0, ChapterKind.SESSION_STARTED, start_frame_index=0, end_frame_index=0),
            _chapter(1, ChapterKind.SESSION_COMPLETED, start_frame_index=1, end_frame_index=1),
        ]
        health_input = _health_input(chapters=chapters)

        metric = CompletionHealthGenerator().generate(health_input)

        assert metric is not None
        assert metric.label == "Ended Immediately"


def _metric(category: HealthCategory, label: str) -> HealthMetric:
    return HealthMetric(
        id=uuid.uuid4(),
        category=category,
        generator_name=category.value.lower(),
        generator_version=1,
        label=label,
        headline=f"{label} headline.",
        evidence=None,
        metrics={},
    )


class TestDeriveGuidance:
    def test_no_guidance_for_empty_metrics(self) -> None:
        assert derive_guidance({}) == []

    def test_flow_fragmentation_rule_fires(self) -> None:
        metrics = {HealthCategory.FLOW: _metric(HealthCategory.FLOW, "Scattered Across Topics")}
        guidance = derive_guidance(metrics)
        assert any("moved across many different areas" in g for g in guidance)

    def test_momentum_interruption_rule_fires(self) -> None:
        metrics = {
            HealthCategory.MOMENTUM: _metric(HealthCategory.MOMENTUM, "Frequently Interrupted")
        }
        guidance = derive_guidance(metrics)
        assert any("Frequent interruptions" in g for g in guidance)

    def test_completion_mid_work_rule_fires(self) -> None:
        metrics = {
            HealthCategory.COMPLETION: _metric(HealthCategory.COMPLETION, "Concluded Mid-Work")
        }
        guidance = derive_guidance(metrics)
        assert any("ended while work was still active" in g for g in guidance)

    def test_stability_erratic_rule_fires(self) -> None:
        metrics = {HealthCategory.STABILITY: _metric(HealthCategory.STABILITY, "Erratic Pace")}
        guidance = derive_guidance(metrics)
        assert any("uneven" in g for g in guidance)

    def test_focus_momentum_combo_rule_fires(self) -> None:
        metrics = {
            HealthCategory.FOCUS: _metric(HealthCategory.FOCUS, "Highly Focused"),
            HealthCategory.MOMENTUM: _metric(HealthCategory.MOMENTUM, "Strong Momentum"),
        }
        guidance = derive_guidance(metrics)
        assert any("sustained, focused work" in g for g in guidance)

    def test_guidance_never_exceeds_max_items(self) -> None:
        metrics = {
            HealthCategory.FLOW: _metric(HealthCategory.FLOW, "Scattered Across Topics"),
            HealthCategory.MOMENTUM: _metric(HealthCategory.MOMENTUM, "Frequently Interrupted"),
            HealthCategory.COMPLETION: _metric(HealthCategory.COMPLETION, "Concluded Mid-Work"),
            HealthCategory.STABILITY: _metric(HealthCategory.STABILITY, "Erratic Pace"),
        }
        guidance = derive_guidance(metrics)
        assert len(guidance) == 4


class TestBuildHealthReport:
    def test_disabled_generator_is_skipped(self) -> None:
        generator = FocusHealthGenerator()
        generator.enabled = False
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        report = build_health_report(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            health_input=health_input,
            generators=[generator],
        )

        assert HealthCategory.FOCUS not in report.metrics

    def test_failing_generator_does_not_abort_others(self) -> None:
        class _FailingGenerator:
            name = "failing"
            version = 1
            category = HealthCategory.MOMENTUM
            description = "always raises"
            priority = 5
            enabled = True

            def generate(self, health_input: HealthInput) -> HealthMetric | None:
                raise RuntimeError("boom")

        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        report = build_health_report(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            health_input=health_input,
            generators=[_FailingGenerator(), FocusHealthGenerator()],
        )

        assert HealthCategory.MOMENTUM not in report.metrics
        assert HealthCategory.FOCUS in report.metrics

    def test_narrative_concatenates_headlines_in_fixed_category_order(self) -> None:
        chapters = [
            _chapter(
                0, ChapterKind.WORK, start_frame_index=0, end_frame_index=0, duration_seconds=100.0
            )
        ]
        health_input = _health_input(duration_seconds=100.0, chapters=chapters)

        report = build_health_report(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            health_input=health_input,
            generators=[MomentumHealthGenerator(), FocusHealthGenerator()],
        )

        focus_headline = report.metrics[HealthCategory.FOCUS].headline
        momentum_headline = report.metrics[HealthCategory.MOMENTUM].headline
        assert report.summary.narrative == f"{focus_headline} {momentum_headline}"

    def test_no_score_field_anywhere_on_report(self) -> None:
        report = build_health_report(
            session_id=uuid.uuid4(),
            generated_at=BASE_TIME,
            health_input=_health_input(),
            generators=list(HEALTH_GENERATORS),
        )

        assert not hasattr(report, "score")
        assert not hasattr(report.summary, "score")
