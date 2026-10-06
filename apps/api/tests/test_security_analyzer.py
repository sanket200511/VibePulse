import json
import uuid
from datetime import UTC, datetime

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.security import SecurityAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext


def _create_event(tmp_file, ext=".py", lang="python") -> AnalyzableEvent:
    return AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=str(tmp_file.parent),
        file_path=tmp_file.name,
        file_name=tmp_file.name,
        file_extension=ext,
        language=lang,
        git_branch="main",
        metadata={},
    )


def _create_context() -> AnalysisContext:
    return AnalysisContext(
        session_activity=SessionActivityContext(events_last_5min=1, events_last_hour=1)
    )


# ── TEST 1: password = "DemoPassword123!" detects SEC001 ─────────────────────
def test_password_assignment_detection(tmp_path):
    f = tmp_path / "config.py"
    f.write_text('password = "DemoPassword123!"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".py", "python"), _create_context())

    assert result is not None
    findings = result.findings["findings"]
    assert len(findings) == 1
    finding = findings[0]
    assert finding["rule_id"] == "SEC001"
    assert finding["severity"] == "HIGH"
    assert finding["title"] == "Password / Credential Exposure"
    assert "[REDACTED]" in finding["evidence"]
    assert "DemoPassword123!" not in str(result.findings)


# ── TEST 2: DATABASE_PASSWORD="DemoPassword123!" detects SEC001 in .env ──────
def test_database_password_env_detection(tmp_path):
    f = tmp_path / ".env.example"
    f.write_text('DATABASE_PASSWORD="DemoPassword123!"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".env.example", "env"), _create_context())

    assert result is not None
    findings = result.findings["findings"]
    assert len(findings) == 1
    finding = findings[0]
    assert finding["rule_id"] == "SEC001"
    assert finding["severity"] == "HIGH"
    assert finding["evidence"] == 'DATABASE_PASSWORD="[REDACTED]"'
    assert "DemoPassword123!" not in str(result.findings)


# ── TEST 3: DB_PASSWORD="secret123" detects SEC001 ───────────────────────────
def test_db_password_detection(tmp_path):
    f = tmp_path / "settings.env"
    f.write_text('DB_PASSWORD="secret123"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".env", "env"), _create_context())

    assert result is not None
    findings = result.findings["findings"]
    assert len(findings) == 1
    assert findings[0]["rule_id"] == "SEC001"
    assert findings[0]["evidence"] == 'DB_PASSWORD="[REDACTED]"'
    assert "secret123" not in str(result.findings)


# ── TEST 4: "Please enter your password" -> NO finding ───────────────────────
def test_prose_sentence_no_false_positive(tmp_path):
    f = tmp_path / "prompt.py"
    f.write_text('print("Please enter your password")\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".py", "python"), _create_context())

    assert result is None


# ── TEST 5: PASSWORD="your_password_here" -> NO finding ─────────────────────
def test_placeholder_your_password_here_no_finding(tmp_path):
    f = tmp_path / ".env"
    f.write_text('PASSWORD="your_password_here"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".env", "env"), _create_context())

    assert result is None


# ── TEST 6: PASSWORD="changeme" -> NO finding ────────────────────────────────
def test_placeholder_changeme_no_finding(tmp_path):
    f = tmp_path / ".env"
    f.write_text('PASSWORD="changeme"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".env", "env"), _create_context())

    assert result is None


# ── TEST 7: PASSWORD="<password>" -> NO finding ──────────────────────────────
def test_placeholder_bracketed_password_no_finding(tmp_path):
    f = tmp_path / "config.ini"
    f.write_text('PASSWORD="<password>"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".ini", "ini"), _create_context())

    assert result is None


# ── TEST 8: Redaction Guarantee ──────────────────────────────────────────────
def test_redaction_guarantee(tmp_path):
    f = tmp_path / "server.py"
    raw_secret = "DemoPassword123!"
    f.write_text(f'DATABASE_PASSWORD="{raw_secret}"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    result = analyzer.analyze(_create_event(f, ".py", "python"), _create_context())

    assert result is not None
    findings = result.findings["findings"]
    assert len(findings) == 1
    finding = findings[0]

    # Verify field values
    assert finding["symbol"] == 'DATABASE_PASSWORD="[REDACTED]"'
    assert finding["evidence"] == 'DATABASE_PASSWORD="[REDACTED]"'
    assert finding["redacted_evidence"] == 'DATABASE_PASSWORD="[REDACTED]"'

    # Strict assertion: raw secret string must NOT exist anywhere in findings structure
    serialized_findings = json.dumps(result.findings)
    assert raw_secret not in serialized_findings
    assert "[REDACTED]" in serialized_findings


# ── TEST 9: Multiple Supported Formats (YAML, JSON, TS) ─────────────────────
def test_yaml_and_json_and_ts_support(tmp_path):
    # YAML
    yaml_file = tmp_path / "application.yaml"
    yaml_file.write_text('database_password: "LiveSecretVal987"\n', encoding="utf-8")
    analyzer = SecurityAnalyzer()
    res_yaml = analyzer.analyze(_create_event(yaml_file, ".yaml", "yaml"), _create_context())
    assert res_yaml is not None
    assert res_yaml.findings["findings"][0]["rule_id"] == "SEC001"
    assert "LiveSecretVal987" not in str(res_yaml.findings)

    # JSON
    json_file = tmp_path / "secrets.json"
    json_file.write_text('{"db_password": "LiveSecretVal987"}\n', encoding="utf-8")
    res_json = analyzer.analyze(_create_event(json_file, ".json", "json"), _create_context())
    assert res_json is not None
    assert res_json.findings["findings"][0]["rule_id"] == "SEC001"
    assert "LiveSecretVal987" not in str(res_json.findings)

    # TypeScript
    ts_file = tmp_path / "db.ts"
    ts_file.write_text('const db_pass = "LiveSecretVal987";\n', encoding="utf-8")
    res_ts = analyzer.analyze(_create_event(ts_file, ".ts", "typescript"), _create_context())
    assert res_ts is not None
    assert res_ts.findings["findings"][0]["rule_id"] == "SEC001"
    assert "LiveSecretVal987" not in str(res_ts.findings)


# ── TEST 10: Full End-to-End Pipeline & DB Persistence ───────────────────────
@pytest.mark.asyncio
async def test_security_pipeline_e2e_persistence(client, test_session_factory, tmp_path):
    f = tmp_path / ".env.example"
    raw_secret = "DemoPassword123!"
    f.write_text(f'DATABASE_PASSWORD="{raw_secret}"\n', encoding="utf-8")

    session_id = uuid.uuid4()
    payload = {
        "schema_version": 1,
        "event_type": "FILE_MODIFIED",
        "timestamp": datetime.now(tz=UTC).isoformat(),
        "session_id": str(session_id),
        "project_root": str(tmp_path),
        "file_path": f.name,
        "file_name": f.name,
        "file_extension": ".env.example",
        "language": "env",
        "git_branch": "main",
        "metadata": {},
    }

    response = await client.post("/events", json=payload)
    assert response.status_code == 201
    event_data = response.json()
    event_id = event_data["id"]

    # Dispatch analysis with test_session_factory
    from app.features.analysis import service as analysis_service
    from app.features.events import service as events_service
    from app.features.events.schemas import DevelopmentEventRead

    event_read = DevelopmentEventRead.model_validate(event_data)
    analyzable = events_service.to_analyzable_event(event_read)
    await analysis_service.dispatch(analyzable, test_session_factory)

    # Verify through analysis API endpoint
    analysis_resp = await client.get(f"/events/{event_id}/analysis")
    assert analysis_resp.status_code == 200
    body = analysis_resp.json()

    sec_analyses = [a for a in body["analyses"] if a["analyzer_name"] == "security_guardian"]
    assert len(sec_analyses) == 1
    sec = sec_analyses[0]

    persisted_findings_str = json.dumps(sec["findings"])

    # Strict verification: raw secret is NEVER in API response or stored analysis
    assert raw_secret not in persisted_findings_str
    assert "[REDACTED]" in persisted_findings_str
    assert sec["findings"]["findings"][0]["rule_id"] == "SEC001"
    assert sec["findings"]["findings"][0]["severity"] == "HIGH"
    assert sec["findings"]["findings"][0]["title"] == "Password / Credential Exposure"


# ── TEST 11: AWS Access Key and Secret Key with Underscores Detection ──────────
def test_aws_credentials_and_debug_detection(tmp_path):
    settings_file = tmp_path / "settings.py"
    settings_file.write_text(
        "# Test config\n"
        'AWS_ACCESS_KEY_ID = "AKIADEMO000000000000"\n'
        'AWS_SECRET_ACCESS_KEY = "DEMO_SECRET_KEY_NOT_REAL"\n'
        "DEBUG = True\n",
        encoding="utf-8",
    )

    analyzer = SecurityAnalyzer()
    res = analyzer.analyze(_create_event(settings_file, ".py", "python"), _create_context())
    assert res is not None

    findings = res.findings["findings"]
    # Must detect both AWS credentials and DEBUG=True
    rule_ids = [f["rule_id"] for f in findings]
    assert "AWS_SECRET" in rule_ids or "SEC001" in rule_ids
    assert "DEBUG_TRUE" in rule_ids

    # Verify zero leakage of raw secrets in findings
    serialized = json.dumps(res.findings)
    assert "AKIADEMO000000000000" not in serialized
    assert "DEMO_SECRET_KEY_NOT_REAL" not in serialized
    assert "[REDACTED]" in serialized

    # Check evidence values for AWS findings
    aws_findings = [f for f in findings if f["rule_id"] in ("AWS_SECRET", "SEC001")]
    assert len(aws_findings) >= 2
    for af in aws_findings:
        assert af["severity"] == "HIGH"
        assert "[REDACTED]" in af["evidence"]
        assert "[REDACTED]" in af["redacted_evidence"]

    debug_findings = [f for f in findings if f["rule_id"] == "DEBUG_TRUE"]
    assert len(debug_findings) == 1
    assert debug_findings[0]["severity"] == "MEDIUM"
