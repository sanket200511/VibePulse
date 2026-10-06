"""
Type definitions and data structures for the hybrid secret detection system.

Truth Boundary:
- OBSERVED: Directly observed syntactic or deterministic rule pattern matches.
- INFERRED: Probabilistic ML model classifications and confidence scores.
- UNKNOWN: Inconclusive context or missing model artifact.

Invariant:
- Raw secret candidate strings MUST NEVER be stored, serialized, or logged.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

SecretClassification = Literal[
    "REAL_SECRET",
    "PLACEHOLDER_OR_EXAMPLE",
    "NOT_SECRET",
]

ConfidenceTier = Literal[
    "HIGH_CONFIDENCE_SECRET",
    "LIKELY_SECRET",
    "LIKELY_PLACEHOLDER",
    "NOT_SECRET",
    "UNKNOWN",
]

DetectionSource = Literal[
    "deterministic",
    "ml",
    "hybrid",
]

TruthState = Literal[
    "OBSERVED",
    "INFERRED",
    "UNKNOWN",
]


@dataclass(frozen=True)
class SecretCandidate:
    """
    In-memory representation of a candidate string found in source code.

    CRITICAL SECURITY INVARIANT:
    The candidate's raw secret string is accessible ONLY in-memory during extraction
    and feature calculation. It is NEVER serialized into dictionaries, database models,
    logs, or network payloads.
    """

    line_number: int
    variable_name: str
    file_path: str
    file_type: str
    path_category: Literal[
        "production", "test", "fixture", "example", "docs", "config", "generated"
    ]
    has_assignment: bool
    context_window_redacted: str
    length: int
    entropy: float
    digit_ratio: float
    uppercase_ratio: float
    symbol_ratio: float
    raw_candidate_in_memory: str = field(repr=False)


@dataclass(frozen=True)
class DeterministicResult:
    """Result of deterministic rule scanning on a line/candidate."""

    rule_id: str | None
    rule_title: str | None
    severity: str | None
    category: str | None
    is_match: bool
    redacted_evidence: str
    risk_contribution: int
    deterministic_score: float  # 0.0 to 1.0


@dataclass(frozen=True)
class MLResult:
    """Result of ML inference on extracted candidate features."""

    model_name: str
    model_version: str
    classification: SecretClassification
    confidence: float
    p_real_secret: float
    p_placeholder: float
    p_not_secret: float
    inference_latency_ms: float
    is_available: bool = True
    error_message: str | None = None


@dataclass(frozen=True)
class HybridDetectionResult:
    """
    Fused decision combining deterministic analysis and ML classification.
    """

    classification: SecretClassification
    confidence_tier: ConfidenceTier
    fused_confidence: float
    detection_source: DetectionSource
    truth_state: TruthState
    deterministic_rule_id: str | None
    ml_model_name: str | None
    ml_model_version: str | None
    ml_classification: SecretClassification | None
    ml_confidence: float | None
    redacted_evidence: str
    line_number: int
    variable_name: str
    file_display: str
    severity: str
    risk_contribution: int
    why: str
    remediation: str
    metadata: dict[str, Any] = field(default_factory=dict)
