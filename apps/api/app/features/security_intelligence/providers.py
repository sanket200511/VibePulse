"""
Security Signal Providers & ML Extension Point.

Defines the clean, extensible interface for security signal analysis.
Current implementation uses the deterministic RuleBasedSecurityProvider.
MLSecurityProvider is defined as a clean extension interface for future
behavioral anomaly detection (e.g. abnormal development burst rates or
abnormal file access patterns deviating from project Engineering DNA).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.core.domain.events import AnalyzableEvent


class SecuritySignalProvider(ABC):
    """Abstract base class for security signal analysis providers."""

    @abstractmethod
    def analyze_signals(
        self,
        events: list[AnalyzableEvent],
        observed_files: set[str],
        event_analyses: list[dict[str, Any]],
        project_root: str,
    ) -> dict[str, Any]:
        """Produce security findings, auth signals, and configuration risks."""
        raise NotImplementedError


class RuleBasedSecurityProvider(SecuritySignalProvider):
    """
    Deterministic rule-based security analyzer.
    All outputs are strictly evidence-backed and explainable with
    [OBSERVED] or [INFERRED] provenance.
    """

    def analyze_signals(
        self,
        events: list[AnalyzableEvent],
        observed_files: set[str],
        event_analyses: list[dict[str, Any]],
        project_root: str,
    ) -> dict[str, Any]:
        # Implementation is invoked inside Security Intelligence Projection Service
        return {}


class MLSecuritySignalProvider(SecuritySignalProvider):
    """
    Future machine-learning-backed behavioral anomaly provider interface.
    Designed for future statistical / neural models trained on:
      - Project Engineering DNA baseline deviations
      - Abnormal after-hours modification bursts
      - Cross-package credential propagation paths
    Currently operates in passive/unconfigured mode to avoid fabricating fake AI scores.
    """

    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = model_path
        self.is_active = False

    def analyze_signals(
        self,
        events: list[AnalyzableEvent],
        observed_files: set[str],
        event_analyses: list[dict[str, Any]],
        project_root: str,
    ) -> dict[str, Any]:
        # Returns empty list when no trained ML weights are mounted
        return {
            "ml_anomaly_findings": [],
            "status": "UNCONFIGURED (Deterministic rule engine active)",
        }
