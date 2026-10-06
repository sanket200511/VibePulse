"""
Critical Security Invariant Tests: Secret Redaction.

Guarantees that raw candidate secrets NEVER escape the controlled in-memory inference boundary.
Raw secrets must NEVER appear in:
- Candidate metadata dicts
- Feature dictionaries or vectors
- AnalysisFinding dictionaries
- Logs, errors, or serialized models
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.security import SecurityAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext
from app.features.analysis.security.candidate import CandidateExtractor
from app.ml.secret_detection.features.extractor import FeatureExtractor


def test_strict_redaction_in_analyzer_findings(tmp_path):
    f = tmp_path / "production_config.py"
    raw_secret_value = "DemoSuperSecretKey_987654321_SensitiveVal!"
    f.write_text(f'DATABASE_PASSWORD = "{raw_secret_value}"\n', encoding="utf-8")

    analyzer = SecurityAnalyzer()
    event = AnalyzableEvent(
        id=uuid.uuid4(),
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=str(tmp_path),
        file_path="production_config.py",
        file_name="production_config.py",
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

    findings_json = str(result.findings)

    # 1. Raw secret must NEVER appear anywhere in the findings payload
    assert raw_secret_value not in findings_json

    # 2. Evidence must contain [REDACTED]
    finding = result.findings["findings"][0]
    assert "[REDACTED]" in finding["evidence"]
    assert "[REDACTED]" in finding["redacted_evidence"]
    assert "[REDACTED]" in finding["symbol"]

    # 3. Provenance and truth boundary fields must be present
    assert "detection_source" in finding
    assert "truth_state" in finding
    assert finding["truth_state"] in ("OBSERVED", "INFERRED")


def test_feature_pipeline_never_leaks_raw_secret():
    raw_secret = "ConfidentialApiKey_Mock_8877665544332211"
    c_extractor = CandidateExtractor()
    cands = c_extractor.extract_from_lines([f'api_key = "{raw_secret}"'], "server.py")
    assert cands

    # Raw candidate in memory accessible for extraction
    cand = cands[0]
    assert cand.raw_candidate_in_memory == raw_secret

    # When converted to safe dict, raw secret is purged
    safe_d = c_extractor.to_safe_dict(cand)
    assert raw_secret not in str(safe_d)
    assert "raw_candidate_in_memory" not in safe_d

    # When converted to features, raw secret is purged
    f_extractor = FeatureExtractor()
    feat_dict = f_extractor.extract_features(cand)
    feat_vec = f_extractor.to_vector(feat_dict)
    assert raw_secret not in str(feat_dict)
    assert raw_secret not in str(feat_vec)
