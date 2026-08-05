import uuid
from datetime import UTC, datetime

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.static_analysis import StaticAnalysisAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext


@pytest.fixture
def python_file(tmp_path):
    f = tmp_path / "test.py"
    f.write_text(
        "def foo():\n  pass\nclass Bar:\n  pass\nimport os\n# TODO: fix this", encoding="utf-8"
    )
    return f


@pytest.fixture
def ts_file(tmp_path):
    f = tmp_path / "test.ts"
    f.write_text(
        "function foo() {}\nclass Bar {}\nimport { os } from 'os';\n// FIXME: broken",
        encoding="utf-8",
    )
    return f


def test_static_analysis_python(python_file):
    analyzer = StaticAnalysisAnalyzer()

    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=str(python_file.parent),
        file_path=python_file.name,
        file_name=python_file.name,
        file_extension=".py",
        language="python",
        git_branch="main",
        metadata={},
    )

    context = AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=1, events_last_hour=1),
        previous_findings={},
    )

    result = analyzer.analyze(event, context)
    assert result is not None
    assert result.analyzer_name == "static_analysis"
    assert result.findings["functions"] == ["foo"]
    assert result.findings["classes"] == ["Bar"]
    assert result.findings["imports"] == ["import os"]
    assert result.findings["todos"] == ["# TODO: fix this"]
    assert result.findings["functions_added"] == 1
    assert result.findings["functions_removed"] == 0


def test_static_analysis_typescript(ts_file):
    analyzer = StaticAnalysisAnalyzer()

    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=str(ts_file.parent),
        file_path=ts_file.name,
        file_name=ts_file.name,
        file_extension=".ts",
        language="typescript",
        git_branch="main",
        metadata={},
    )

    context = AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=1, events_last_hour=1),
        previous_findings={"static_analysis": {"functions": ["old_func"]}},
    )

    result = analyzer.analyze(event, context)
    assert result is not None
    assert result.findings["functions"] == ["foo"]
    assert result.findings["classes"] == ["Bar"]
    assert result.findings["imports"] == ["import { os } from 'os';"]
    assert result.findings["todos"] == ["// FIXME: broken"]
    assert result.findings["functions_added"] == 1
    assert result.findings["functions_removed"] == 1
