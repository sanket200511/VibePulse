"""
Tests for FeatureExtractor.
Verifies calculation of Shannon entropy, lexical ratios, and placeholder heuristics.
"""

from __future__ import annotations

from app.features.analysis.security.candidate import CandidateExtractor
from app.ml.secret_detection.features.extractor import (
    FeatureExtractor,
    calculate_placeholder_score,
    calculate_shannon_entropy,
)


def test_shannon_entropy_calculation():
    # Low entropy repeating string
    low_ent = calculate_shannon_entropy("aaaaaaaaaaaa")
    assert low_ent == 0.0

    # High entropy random string
    high_ent = calculate_shannon_entropy("8f#K9!vL2$mP5@zQ")
    assert high_ent > 3.5


def test_placeholder_score_heuristics():
    assert calculate_placeholder_score("YOUR_API_KEY_HERE", "api_key") >= 0.8
    assert calculate_placeholder_score("<password>", "password") >= 0.8
    assert calculate_placeholder_score("dummy_token_123", "token") >= 0.8
    assert calculate_placeholder_score("changeme", "db_pass") >= 0.8

    # Real synthetic secret should have very low placeholder score
    real_synth = "sk-proj-demofake9876543210zyxwvutsrqponmlkjihgfedcba"
    assert calculate_placeholder_score(real_synth, "api_key") < 0.3


def test_feature_vector_contains_no_raw_strings():
    extractor = FeatureExtractor()
    c_extractor = CandidateExtractor()
    cands = c_extractor.extract_from_lines(
        ['api_key = "fake_sensitive_key_12345678"'], "src/app.py"
    )
    assert cands

    feats = extractor.extract_features(cands[0], deterministic_score=0.9)
    vector = extractor.to_vector(feats)

    # All vector elements must be numerical floats
    assert all(isinstance(v, (int, float)) for v in vector)
    assert "fake_sensitive_key_12345678" not in str(feats)
    assert "fake_sensitive_key_12345678" not in str(vector)
