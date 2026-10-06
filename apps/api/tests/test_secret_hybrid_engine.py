"""
Tests for HybridDecisionEngine.
Verifies fusion of deterministic rules, ML probabilities, and placeholder suppression.
"""

from __future__ import annotations

from app.features.analysis.security.candidate import CandidateExtractor
from app.features.analysis.security.hybrid_engine import HybridDecisionEngine
from app.features.analysis.security.types import DeterministicResult, MLResult


def test_hybrid_high_confidence_real_secret():
    engine = HybridDecisionEngine()
    c_extractor = CandidateExtractor()
    cand = c_extractor.extract_from_lines(
        ['api_key = "sk-live-mock9876543210zyxwvuts"'], "src/auth.py"
    )[0]

    det = DeterministicResult(
        rule_id="SEC001",
        rule_title="Password / Credential Exposure",
        severity="CRITICAL",
        category="Secrets",
        is_match=True,
        redacted_evidence='api_key = "[REDACTED]"',
        risk_contribution=80,
        deterministic_score=0.90,
    )
    ml = MLResult(
        model_name="rf-secret-classifier",
        model_version="1.0.0",
        classification="REAL_SECRET",
        confidence=0.94,
        p_real_secret=0.94,
        p_placeholder=0.03,
        p_not_secret=0.03,
        inference_latency_ms=2.5,
    )

    fused = engine.fuse(cand, det, ml)
    assert fused is not None
    assert fused.classification == "REAL_SECRET"
    assert fused.confidence_tier == "HIGH_CONFIDENCE_SECRET"
    assert fused.detection_source == "hybrid"
    assert fused.truth_state == "INFERRED"
    assert "[REDACTED]" in fused.redacted_evidence


def test_hybrid_placeholder_suppression():
    engine = HybridDecisionEngine()
    c_extractor = CandidateExtractor()
    cand = c_extractor.extract_from_lines(['api_key = "YOUR_API_KEY_HERE"'], "examples/setup.py")[0]

    det = DeterministicResult(
        rule_id="SEC001",
        rule_title="Password / Credential Exposure",
        severity="HIGH",
        category="Secrets",
        is_match=True,
        redacted_evidence='api_key = "[REDACTED]"',
        risk_contribution=80,
        deterministic_score=0.85,
    )
    ml = MLResult(
        model_name="rf-secret-classifier",
        model_version="1.0.0",
        classification="PLACEHOLDER_OR_EXAMPLE",
        confidence=0.92,
        p_real_secret=0.04,
        p_placeholder=0.92,
        p_not_secret=0.04,
        inference_latency_ms=2.1,
    )

    fused = engine.fuse(cand, det, ml)
    assert fused is not None
    assert fused.classification == "PLACEHOLDER_OR_EXAMPLE"
    assert fused.confidence_tier == "LIKELY_PLACEHOLDER"
    assert fused.severity == "LOW"
    assert fused.risk_contribution == 5


def test_hybrid_fallback_when_ml_unavailable():
    engine = HybridDecisionEngine()
    c_extractor = CandidateExtractor()
    cand = c_extractor.extract_from_lines(['secret = "LiveSecretValue987"'], "app.py")[0]

    det = DeterministicResult(
        rule_id="SEC001",
        rule_title="Password / Credential Exposure",
        severity="CRITICAL",
        category="Secrets",
        is_match=True,
        redacted_evidence='secret = "[REDACTED]"',
        risk_contribution=80,
        deterministic_score=0.85,
    )

    fused = engine.fuse(cand, det, ml=None)
    assert fused is not None
    assert fused.detection_source == "deterministic"
    assert fused.truth_state == "OBSERVED"
    assert fused.deterministic_rule_id == "SEC001"
