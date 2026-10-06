"""
Tests for SecretCandidate extraction layer.
Verifies candidate discovery, safe context redaction, and no raw secret leakage.
"""

from __future__ import annotations

from app.features.analysis.security.candidate import CandidateExtractor


def test_extract_candidates_from_python_lines():
    extractor = CandidateExtractor(min_candidate_length=6)
    lines = [
        "import os",
        'api_key = "demo_fake_token_123456789"',
        'normal_var = "hello"',  # length < 6 or below threshold
        'password = "SafeFakePassword!#2026"',
    ]
    candidates = extractor.extract_from_lines(lines, "src/auth/client.py")

    assert len(candidates) >= 2
    keys = [c.variable_name for c in candidates]
    assert "api_key" in keys
    assert "password" in keys

    # Verify context window is redacted
    for c in candidates:
        assert "[REDACTED]" in c.context_window_redacted
        assert "demo_fake_token_123456789" not in c.context_window_redacted
        assert "SafeFakePassword!#2026" not in c.context_window_redacted


def test_candidate_safe_dict_never_contains_raw_value():
    extractor = CandidateExtractor()
    lines = ['secret_token = "mock_sensitive_key_9876543210"']
    candidates = extractor.extract_from_lines(lines, "config/secrets.py")

    assert len(candidates) == 1
    safe_dict = extractor.to_safe_dict(candidates[0])

    assert "raw_candidate_in_memory" not in safe_dict
    assert "mock_sensitive_key_9876543210" not in str(safe_dict)
    assert safe_dict["variable_name"] == "secret_token"
    assert safe_dict["length"] == len("mock_sensitive_key_9876543210")
    assert safe_dict["entropy"] > 3.0


def test_path_categorization():
    extractor = CandidateExtractor()
    assert extractor.extract_from_lines(['k = "sample1234"'], "tests/fixtures/mock.py")[
        0
    ].path_category in ("test", "fixture")
    assert (
        extractor.extract_from_lines(['k = "sample1234"'], "docs/setup.md")[0].path_category
        == "docs"
    )
    assert (
        extractor.extract_from_lines(['k = "sample1234"'], "examples/demo.py")[0].path_category
        == "example"
    )
    assert (
        extractor.extract_from_lines(['k = "sample1234"'], ".env.local")[0].path_category
        == "config"
    )
    assert (
        extractor.extract_from_lines(['k = "sample1234"'], "src/backend/app.py")[0].path_category
        == "production"
    )
