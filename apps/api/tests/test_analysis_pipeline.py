"""
Unit tests for the analysis pipeline.

Tests cover:
- Priority ordering and disabled-analyzer filtering
- Full pipeline run producing AnalysisResult with correct structure
- Fault isolation: one analyzer raising does not abort the pipeline
- Timing: duration_ms is recorded for every execution
- Opt-out: analyzers returning None produce an execution with no finding
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import (
    AnalysisContext,
    AnalysisFinding,
    SessionActivityContext,
)
from app.features.analysis.pipeline import AnalysisPipeline

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _event(**kwargs: object) -> AnalyzableEvent:
    defaults: dict = {
        "id": uuid.uuid4(),
        "event_type": "FILE_MODIFIED",
        "timestamp": datetime.now(UTC),
        "session_id": uuid.uuid4(),
        "project_root": "/repo",
        "file_path": "/repo/src/app.py",
        "file_name": "app.py",
        "file_extension": ".py",
        "language": None,
        "git_branch": "feat/x",
        "metadata": {},
    }
    defaults.update(kwargs)
    return AnalyzableEvent(**defaults)


def _ctx() -> AnalysisContext:
    return AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=2, events_last_hour=10)
    )


def _make_analyzer(
    *,
    name: str = "stub",
    priority: int = 10,
    enabled: bool = True,
    returns: AnalysisFinding | None = None,
    raises: Exception | None = None,
) -> MagicMock:
    """Build a mock Analyzer that satisfies the Protocol."""
    analyzer = MagicMock()
    analyzer.name = name
    analyzer.version = 1
    analyzer.description = f"stub {name}"
    analyzer.priority = priority
    analyzer.enabled = enabled

    if raises is not None:
        analyzer.analyze.side_effect = raises
    else:
        analyzer.analyze.return_value = returns
    return analyzer


def _finding(analyzer_name: str = "stub") -> AnalysisFinding:
    return AnalysisFinding(
        analyzer_name=analyzer_name,
        analyzer_version=1,
        findings={"key": "value"},
    )


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------


class TestPipelineConstruction:
    def test_disabled_analyzers_are_excluded(self) -> None:
        enabled = _make_analyzer(name="a", enabled=True, priority=1)
        disabled = _make_analyzer(name="b", enabled=False, priority=2)
        pipeline = AnalysisPipeline([enabled, disabled])

        # Access private list to confirm filtering — acceptable for unit test.
        assert len(pipeline._analyzers) == 1
        assert pipeline._analyzers[0].name == "a"

    def test_analyzers_sorted_by_priority_ascending(self) -> None:
        a = _make_analyzer(name="a", priority=30)
        b = _make_analyzer(name="b", priority=10)
        c = _make_analyzer(name="c", priority=20)
        pipeline = AnalysisPipeline([a, b, c])

        names = [az.name for az in pipeline._analyzers]
        assert names == ["b", "c", "a"]

    def test_empty_list_creates_valid_pipeline(self) -> None:
        pipeline = AnalysisPipeline([])
        assert pipeline._analyzers == []


# ---------------------------------------------------------------------------
# run() — normal paths
# ---------------------------------------------------------------------------


class TestPipelineRun:
    @pytest.mark.asyncio
    async def test_run_returns_correct_event_id(self) -> None:
        event = _event()
        pipeline = AnalysisPipeline([])
        result = await pipeline.run(event, _ctx())

        assert result.event_id == event.id

    @pytest.mark.asyncio
    async def test_run_with_no_analyzers_returns_empty_executions(self) -> None:
        result = await AnalysisPipeline([]).run(_event(), _ctx())
        assert result.executions == []

    @pytest.mark.asyncio
    async def test_run_calls_each_analyzer_once(self) -> None:
        a = _make_analyzer(name="a", returns=_finding("a"))
        b = _make_analyzer(name="b", returns=_finding("b"))
        pipeline = AnalysisPipeline([a, b])

        await pipeline.run(_event(), _ctx())

        a.analyze.assert_called_once()
        b.analyze.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_passes_event_and_context_to_analyzers(self) -> None:
        event = _event()
        ctx = _ctx()
        az = _make_analyzer(returns=_finding())
        pipeline = AnalysisPipeline([az])

        await pipeline.run(event, ctx)

        az.analyze.assert_called_once_with(event, ctx)

    @pytest.mark.asyncio
    async def test_run_produces_one_execution_per_analyzer(self) -> None:
        analyzers = [
            _make_analyzer(name=f"az{i}", priority=i, returns=_finding(f"az{i}")) for i in range(4)
        ]
        result = await AnalysisPipeline(analyzers).run(_event(), _ctx())

        assert len(result.executions) == 4
        names = [e.analyzer_name for e in result.executions]
        assert names == ["az0", "az1", "az2", "az3"]

    @pytest.mark.asyncio
    async def test_execution_contains_finding(self) -> None:
        finding = _finding("my_analyzer")
        az = _make_analyzer(name="my_analyzer", returns=finding)
        pipeline = AnalysisPipeline([az])

        result = await pipeline.run(_event(), _ctx())

        exec_ = result.executions[0]
        assert exec_.analyzer_name == "my_analyzer"
        assert exec_.finding == finding
        assert exec_.error is None

    @pytest.mark.asyncio
    async def test_opt_out_produces_execution_with_none_finding(self) -> None:
        az = _make_analyzer(name="opt_out", returns=None)
        pipeline = AnalysisPipeline([az])

        result = await pipeline.run(_event(), _ctx())

        exec_ = result.executions[0]
        assert exec_.finding is None
        assert exec_.error is None

    @pytest.mark.asyncio
    async def test_duration_ms_is_recorded_and_positive(self) -> None:
        az = _make_analyzer(returns=_finding())
        result = await AnalysisPipeline([az]).run(_event(), _ctx())

        assert result.executions[0].duration_ms >= 0.0


# ---------------------------------------------------------------------------
# Fault isolation
# ---------------------------------------------------------------------------


class TestPipelineFaultIsolation:
    @pytest.mark.asyncio
    async def test_failing_analyzer_does_not_abort_pipeline(self) -> None:
        bad = _make_analyzer(name="bad", priority=10, raises=RuntimeError("boom"))
        good = _make_analyzer(name="good", priority=20, returns=_finding("good"))
        pipeline = AnalysisPipeline([bad, good])

        result = await pipeline.run(_event(), _ctx())

        # Both analyzers ran — pipeline did not abort after the failure.
        assert len(result.executions) == 2

    @pytest.mark.asyncio
    async def test_failed_execution_records_error(self) -> None:
        bad = _make_analyzer(name="bad", raises=ValueError("bad value"))
        pipeline = AnalysisPipeline([bad])

        result = await pipeline.run(_event(), _ctx())

        exec_ = result.executions[0]
        assert exec_.error == "bad value"
        assert exec_.finding is None

    @pytest.mark.asyncio
    async def test_failed_execution_still_records_duration(self) -> None:
        bad = _make_analyzer(name="bad", raises=RuntimeError("x"))
        result = await AnalysisPipeline([bad]).run(_event(), _ctx())

        assert result.executions[0].duration_ms >= 0.0

    @pytest.mark.asyncio
    async def test_all_analyzers_failing_returns_all_error_executions(self) -> None:
        analyzers = [
            _make_analyzer(name=f"bad{i}", priority=i, raises=RuntimeError("x")) for i in range(3)
        ]
        result = await AnalysisPipeline(analyzers).run(_event(), _ctx())

        assert len(result.executions) == 3
        assert all(e.error is not None for e in result.executions)

    @pytest.mark.asyncio
    async def test_execution_order_preserved_despite_error(self) -> None:
        bad = _make_analyzer(name="bad", priority=10, raises=RuntimeError("x"))
        good = _make_analyzer(name="good", priority=20, returns=_finding("good"))
        pipeline = AnalysisPipeline([bad, good])

        result = await pipeline.run(_event(), _ctx())

        assert result.executions[0].analyzer_name == "bad"
        assert result.executions[1].analyzer_name == "good"
        assert result.executions[1].finding is not None
