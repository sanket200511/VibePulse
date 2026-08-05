import uuid
from datetime import UTC, datetime

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.security import SecurityAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext


@pytest.fixture
def vulnerable_python_file(tmp_path):
    f = tmp_path / "test.py"
    f.write_text(
        "OPENAI_API_KEY = 'sk-T3BlbkFJabcdefghijklmnopqrstuvwxyz'\n"
        "password = 'admin'\n"
        "eval('print(1)')\n"
        "os.system('rm -rf /')\n"
        "# TODO SECURITY check this\n"
        "subprocess.Popen(cmd, shell=True)\n",
        encoding="utf-8",
    )
    return f


def test_security_analyzer(vulnerable_python_file):
    analyzer = SecurityAnalyzer()

    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=str(vulnerable_python_file.parent),
        file_path=vulnerable_python_file.name,
        file_name=vulnerable_python_file.name,
        file_extension=".py",
        language="python",
        git_branch="main",
        metadata={},
    )

    context = AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=1, events_last_hour=1)
    )

    result = analyzer.analyze(event, context)
    assert result is not None
    assert result.analyzer_name == "security_guardian"

    findings = result.findings["findings"]
    assert len(findings) == 6

    rule_ids = [f["rule_id"] for f in findings]
    assert "HARDCODED_OPENAI_KEY" in rule_ids
    assert "HARDCODED_PASSWORD" in rule_ids
    assert "EVAL_USAGE" in rule_ids
    assert "OS_SYSTEM" in rule_ids
    assert "TODO_SECURITY" in rule_ids
    assert "SUBPROCESS_SHELL_TRUE" in rule_ids
