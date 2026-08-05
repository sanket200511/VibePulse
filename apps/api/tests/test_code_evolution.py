import uuid
from datetime import UTC, datetime

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.code_evolution import CodeEvolutionAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext


def test_code_evolution_analyzer():
    analyzer = CodeEvolutionAnalyzer()

    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root="/test",
        file_path="test.py",
        file_name="test.py",
        file_extension=".py",
        language="python",
        git_branch="main",
        metadata={},
    )

    context = AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=1, events_last_hour=1),
        previous_findings={
            "static_analysis": {
                "functions": ["old_func", "kept_func"],
                "classes": ["OldClass"],
                "imports": ["import sys"],
                "todos": ["# TODO: fix"],
                "line_count": 100,
            }
        },
        current_findings={
            "static_analysis": {
                "functions": ["new_func", "kept_func"],
                "classes": ["NewClass"],
                "imports": ["import os"],
                "todos": ["# TODO: new"],
                "line_count": 120,
            }
        },
    )

    result = analyzer.analyze(event, context)
    assert result is not None
    assert result.analyzer_name == "code_evolution"

    obs = result.findings["observations"]
    assert len(obs) == 9

    kinds = [o["kind"] for o in obs]
    assert "FUNCTION_ADDED" in kinds
    assert "FUNCTION_REMOVED" in kinds
    assert "CLASS_ADDED" in kinds
    assert "CLASS_REMOVED" in kinds
    assert "IMPORT_INTRODUCED" in kinds
    assert "IMPORT_REMOVED" in kinds
    assert "TODO_INTRODUCED" in kinds
    assert "TODO_RESOLVED" in kinds
    assert "FILE_EXPANDED" in kinds


def test_code_evolution_deleted():
    analyzer = CodeEvolutionAnalyzer()

    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_DELETED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root="/test",
        file_path="test.py",
        file_name="test.py",
        file_extension=".py",
        language="python",
        git_branch="main",
        metadata={},
    )

    context = AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=1, events_last_hour=1),
        previous_findings={},
        current_findings={},
    )

    result = analyzer.analyze(event, context)
    assert result is not None
    assert len(result.findings["observations"]) == 1
    assert result.findings["observations"][0]["kind"] == "FILE_DELETED"
