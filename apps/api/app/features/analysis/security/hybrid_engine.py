"""
Hybrid Decision Fusion Engine for Secret Detection.

Combines:
- Deterministic AST/Regex Rule matching
- Classical / Transformer ML probability distributions
- Safe Context & Entropy metrics
- Placeholder Heuristic Scores

Produces:
- Final 3-class classification (REAL_SECRET, PLACEHOLDER_OR_EXAMPLE, NOT_SECRET)
- Confidence Tier (HIGH_CONFIDENCE_SECRET, LIKELY_SECRET, LIKELY_PLACEHOLDER, NOT_SECRET, UNKNOWN)
- Clear provenance (OBSERVED for syntactic matches, INFERRED for ML assessments)
- Strict secret redaction invariant
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.features.analysis.security.types import (
    DeterministicResult,
    HybridDetectionResult,
    MLResult,
    SecretCandidate,
)

logger = logging.getLogger("vortex.security.hybrid")


@dataclass
class HybridThresholds:
    """Configurable decision thresholds for hybrid fusion."""

    high_confidence_ml_threshold: float = 0.70
    likely_secret_ml_threshold: float = 0.50
    placeholder_ml_threshold: float = 0.50
    min_secret_entropy: float = 3.0
    placeholder_heuristic_cutoff: float = 0.70


class HybridDecisionEngine:
    """
    Fuses deterministic detection and ML probabilities into an actionable security decision.
    """

    def __init__(self, thresholds: HybridThresholds | None = None) -> None:
        self.thresholds = thresholds or HybridThresholds()

    def fuse(
        self,
        candidate: SecretCandidate,
        deterministic: DeterministicResult,
        ml: MLResult | None,
    ) -> HybridDetectionResult | None:
        """
        Synthesize deterministic and ML results into a final HybridDetectionResult.
        Returns None if candidate is definitively NOT_SECRET and no rule fired.
        """
        # If ML is not available, execute deterministic fallback
        if ml is None or not ml.is_available:
            return self._deterministic_fallback(candidate, deterministic)

        p_real = ml.p_real_secret
        p_ph = ml.p_placeholder
        p_not = ml.p_not_secret

        # ── 1. PLACEHOLDER / TEMPLATE SUPPRESSION ─────────────────────────────
        # If placeholder score is high, or ML classifies as PLACEHOLDER with high probability
        if p_ph >= self.thresholds.placeholder_ml_threshold or (
            deterministic.is_match and p_ph > 0.40
        ):
            return HybridDetectionResult(
                classification="PLACEHOLDER_OR_EXAMPLE",
                confidence_tier="LIKELY_PLACEHOLDER",
                fused_confidence=round(p_ph, 4),
                detection_source="hybrid",
                truth_state="INFERRED",
                deterministic_rule_id=deterministic.rule_id,
                ml_model_name=ml.model_name,
                ml_model_version=ml.model_version,
                ml_classification="PLACEHOLDER_OR_EXAMPLE",
                ml_confidence=round(ml.confidence, 4),
                redacted_evidence=deterministic.redacted_evidence
                or candidate.context_window_redacted,
                line_number=candidate.line_number,
                variable_name=candidate.variable_name,
                file_display=candidate.file_path,
                severity="LOW",
                risk_contribution=5,
                why=(
                    "Candidate matches credential syntax but has been classified "
                    "as a placeholder or template example."
                ),
                remediation=(
                    "Verify if this placeholder should be loaded via secure environment "
                    "variables instead of hardcoded strings."
                ),
                metadata={
                    "p_real_secret": p_real,
                    "p_placeholder": p_ph,
                    "p_not_secret": p_not,
                    "entropy": candidate.entropy,
                    "inference_latency_ms": ml.inference_latency_ms,
                },
            )

        # ── 2. HIGH CONFIDENCE SECRET ─────────────────────────────────────────
        # Deterministic rule matched AND ML confirms real secret with high probability
        if (
            deterministic.is_match
            and p_real >= self.thresholds.high_confidence_ml_threshold
            and p_ph < 0.25
        ) or (p_real >= 0.90 and candidate.entropy >= self.thresholds.min_secret_entropy):
            fused_conf = max(p_real, deterministic.deterministic_score)
            return HybridDetectionResult(
                classification="REAL_SECRET",
                confidence_tier="HIGH_CONFIDENCE_SECRET",
                fused_confidence=round(fused_conf, 4),
                detection_source="hybrid",
                truth_state="INFERRED",  # Classification is inferred from ML + pattern
                deterministic_rule_id=deterministic.rule_id,
                ml_model_name=ml.model_name,
                ml_model_version=ml.model_version,
                ml_classification="REAL_SECRET",
                ml_confidence=round(ml.confidence, 4),
                redacted_evidence=deterministic.redacted_evidence
                or candidate.context_window_redacted,
                line_number=candidate.line_number,
                variable_name=candidate.variable_name,
                file_display=candidate.file_path,
                severity=deterministic.severity or "CRITICAL",
                risk_contribution=deterministic.risk_contribution or 80,
                why=(
                    f"High-entropy secret confirmed by pattern match "
                    f"({deterministic.rule_id or 'keyword'}) and "
                    f"ML classification (p={p_real:.2f})."
                ),
                remediation=(
                    "Immediately revoke and rotate this secret. "
                    "Remove the hardcoded value and load via secret manager."
                ),
                metadata={
                    "p_real_secret": p_real,
                    "p_placeholder": p_ph,
                    "p_not_secret": p_not,
                    "entropy": candidate.entropy,
                    "inference_latency_ms": ml.inference_latency_ms,
                },
            )

        # ── 3. LIKELY SECRET ──────────────────────────────────────────────────
        # Either deterministic rule matched with moderate ML support, or ML strongly signaled secret
        if (
            deterministic.is_match
            and p_real >= self.thresholds.likely_secret_ml_threshold
            and p_ph < 0.40
        ) or (p_real >= 0.75 and candidate.entropy >= 2.5):
            return HybridDetectionResult(
                classification="REAL_SECRET",
                confidence_tier="LIKELY_SECRET",
                fused_confidence=round(p_real, 4),
                detection_source="hybrid",
                truth_state="INFERRED",
                deterministic_rule_id=deterministic.rule_id,
                ml_model_name=ml.model_name,
                ml_model_version=ml.model_version,
                ml_classification="REAL_SECRET",
                ml_confidence=round(ml.confidence, 4),
                redacted_evidence=deterministic.redacted_evidence
                or candidate.context_window_redacted,
                line_number=candidate.line_number,
                variable_name=candidate.variable_name,
                file_display=candidate.file_path,
                severity=deterministic.severity or "HIGH",
                risk_contribution=deterministic.risk_contribution or 50,
                why=(
                    f"Potential credential pattern identified with positive "
                    f"ML secret likelihood (p={p_real:.2f})."
                ),
                remediation=(
                    "Inspect whether this variable holds sensitive production "
                    "credentials. Move to secure configuration."
                ),
                metadata={
                    "p_real_secret": p_real,
                    "p_placeholder": p_ph,
                    "p_not_secret": p_not,
                    "entropy": candidate.entropy,
                    "inference_latency_ms": ml.inference_latency_ms,
                },
            )

        # ── 4. NOT_SECRET OR UNKNOWN ──────────────────────────────────────────
        # If deterministic rule fired but ML strongly says NOT_SECRET (p_not > 0.85)
        if deterministic.is_match and p_not > 0.85 and candidate.entropy < 2.5:
            # False positive suppressed by ML
            return None

        # If deterministic rule did not fire and candidate is not secret
        if not deterministic.is_match and p_real < 0.50:
            return None

        # Fallback to deterministic rule if match is present
        if deterministic.is_match:
            return self._deterministic_fallback(candidate, deterministic)

        return None

    def _deterministic_fallback(
        self,
        candidate: SecretCandidate,
        deterministic: DeterministicResult,
    ) -> HybridDetectionResult | None:
        """Fallback when ML model is unavailable or disabled."""
        if not deterministic.is_match:
            return None

        return HybridDetectionResult(
            classification="REAL_SECRET",
            confidence_tier="HIGH_CONFIDENCE_SECRET"
            if deterministic.severity == "CRITICAL"
            else "LIKELY_SECRET",
            fused_confidence=deterministic.deterministic_score,
            detection_source="deterministic",
            truth_state="OBSERVED",
            deterministic_rule_id=deterministic.rule_id,
            ml_model_name=None,
            ml_model_version=None,
            ml_classification=None,
            ml_confidence=None,
            redacted_evidence=deterministic.redacted_evidence or candidate.context_window_redacted,
            line_number=candidate.line_number,
            variable_name=candidate.variable_name,
            file_display=candidate.file_path,
            severity=deterministic.severity or "HIGH",
            risk_contribution=deterministic.risk_contribution or 50,
            why=f"Deterministic security rule {deterministic.rule_id or ''} triggered.",
            remediation="Review and redact sensitive credential.",
            metadata={"ml_status": "UNAVAILABLE_FALLBACK"},
        )
