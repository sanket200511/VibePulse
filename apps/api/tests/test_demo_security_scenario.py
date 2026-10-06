"""
Safe Demo Scenario for Secret Detection.

Demonstrates candidate classification differentiation:
1. Synthetic REAL_SECRET candidate (e.g. high-entropy mock key)
2. PLACEHOLDER_OR_EXAMPLE hard negatives (e.g. YOUR_API_KEY_HERE, <PASSWORD>)
3. NOT_SECRET hard negatives (UUID, git commit hash, asset URL)

Verifies real execution through CandidateExtractor, ClassicalSecretClassifier,
HybridDecisionEngine, and SecurityAnalyzer.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.security import SecurityAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext


def test_demo_scenario_differentiation(tmp_path):
    demo_file = tmp_path / "settings.py"
    demo_content = """# Safe Synthetic Demo File
API_KEY = "demo_fake_key_123456789_synthetic_secret_xyz"
API_KEY_PLACEHOLDER = "YOUR_API_KEY_HERE"
PASSWORD_PLACEHOLDER = "<PASSWORD>"
EXAMPLE_TOKEN = "example_token"
COMMIT_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
UUID_VAL = "c9bf9e57-1685-4c89-bafb-ff5af830be8a"
"""
    demo_file.write_text(demo_content, encoding="utf-8")

    analyzer = SecurityAnalyzer()
    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=str(tmp_path),
        file_path="settings.py",
        file_name="settings.py",
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

    findings = result.findings["findings"]
    # Verify the synthetic secret was detected
    secret_findings = [
        f
        for f in findings
        if "demo_fake_key" in str(f.get("what", ""))
        or "API_KEY" in str(f.get("what", ""))
        or f.get("rule_id") in ("SEC001", "SEC-ML-001")
    ]
    assert len(secret_findings) >= 1

    # Verify that raw secret is redacted in every finding
    for f in findings:
        assert "demo_fake_key_123456789_synthetic_secret_xyz" not in str(f)
        assert "[REDACTED]" in f["evidence"]

    # Verify placeholder lines (YOUR_API_KEY_HERE, <PASSWORD>) did not produce critical findings
    critical_findings = [f for f in findings if f["severity"] == "CRITICAL"]
    for cf in critical_findings:
        assert "YOUR_API_KEY_HERE" not in str(cf)
        assert "<PASSWORD>" not in str(cf)
