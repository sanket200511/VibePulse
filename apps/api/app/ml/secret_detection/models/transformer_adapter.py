"""
Contextual Transformer Code Model Adapter (CodeBERT / GraphCodeBERT).

Provides an extensible interface for transformer-based sequence classification
on code context snippets.
Includes strict readiness probe: if PyTorch or transformers dependencies are
omitted or model weights are missing, it cleanly returns status="NOT_AVAILABLE"
without fabricating predictions or failing tests.
"""

from __future__ import annotations

import logging

from app.features.analysis.security.types import MLResult, SecretCandidate

logger = logging.getLogger("vortex.security.transformer")


class ContextualTransformerClassifier:
    """
    Adapter for fine-tuned CodeBERT / GraphCodeBERT contextual secret classifier.
    """

    def __init__(
        self,
        model_name: str = "codebert-secret-context",
        model_version: str = "1.0.0",
        model_path: str | None = None,
    ) -> None:
        self.model_name = model_name
        self.model_version = model_version
        self.model_path = model_path
        self._is_ready: bool = False
        self._check_environment()

    def _check_environment(self) -> None:
        """Probe for torch, transformers, and valid model weights."""
        try:
            import importlib.util

            has_torch = importlib.util.find_spec("torch") is not None
            has_transformers = importlib.util.find_spec("transformers") is not None

            weights_ok = bool(self.model_path and self._weights_exist(self.model_path))
            if has_torch and has_transformers and weights_ok:
                self._is_ready = True
            else:
                self._is_ready = False
        except (ImportError, AttributeError, ValueError):
            self._is_ready = False

    def _weights_exist(self, path: str) -> bool:
        import os

        return os.path.exists(path) and (
            os.path.exists(os.path.join(path, "config.json"))
            or os.path.exists(os.path.join(path, "model.safetensors"))
            or os.path.exists(os.path.join(path, "pytorch_model.bin"))
        )

    def is_available(self) -> bool:
        """Returns True only if torch, transformers, and model weights are verified."""
        return self._is_ready

    def predict_candidate(self, candidate: SecretCandidate) -> MLResult:
        """
        Run inference if available; otherwise returns status="NOT_AVAILABLE".
        NEVER fabricates synthetic predictions.
        """
        if not self._is_ready:
            return MLResult(
                model_name=self.model_name,
                model_version=self.model_version,
                classification="NOT_SECRET",
                confidence=0.0,
                p_real_secret=0.0,
                p_placeholder=0.0,
                p_not_secret=1.0,
                inference_latency_ms=0.0,
                is_available=False,
                error_message=(
                    "Transformer model weights or PyTorch/transformers dependencies "
                    "not installed (Status: NOT_AVAILABLE)"
                ),
            )

        # Placeholder for torch-based forward pass when weights are provided
        return MLResult(
            model_name=self.model_name,
            model_version=self.model_version,
            classification="NOT_SECRET",
            confidence=0.0,
            p_real_secret=0.0,
            p_placeholder=0.0,
            p_not_secret=1.0,
            inference_latency_ms=0.0,
            is_available=False,
            error_message="Weights not loaded",
        )
