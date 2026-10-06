"""
Classical Machine Learning Classifier for Secret Detection.

Uses safe engineered features (entropy, character ratios, keyword scores,
placeholder heuristics, assignment syntax, path context) to classify candidate strings into:
1. REAL_SECRET
2. PLACEHOLDER_OR_EXAMPLE
3. NOT_SECRET
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

import joblib
from app.features.analysis.security.types import MLResult, SecretCandidate, SecretClassification
from app.ml.secret_detection.features.extractor import FEATURE_NAMES, FeatureExtractor
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier

CLASSES: list[SecretClassification] = [
    "REAL_SECRET",
    "PLACEHOLDER_OR_EXAMPLE",
    "NOT_SECRET",
]


class ClassicalSecretClassifier:
    """
    Random Forest / HistGradientBoosting 3-class classifier for secret candidate classification.
    """

    def __init__(
        self,
        model_type: str = "random_forest",
        model_name: str = "rf-secret-classifier",
        model_version: str = "1.0.0",
        random_state: int = 42,
    ) -> None:
        self.model_type = model_type
        self.model_name = model_name
        self.model_version = model_version
        self.random_state = random_state
        self.classes: list[SecretClassification] = list(CLASSES)
        self.extractor = FeatureExtractor()

        if model_type == "hist_gradient_boosting":
            self.model = HistGradientBoostingClassifier(
                max_iter=150,
                learning_rate=0.08,
                random_state=random_state,
            )
        else:
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=12,
                class_weight="balanced",
                random_state=random_state,
            )

        self._is_trained: bool = False
        self.metadata: dict[str, Any] = {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "model_type": self.model_type,
            "feature_names": FEATURE_NAMES,
            "classes": self.classes,
        }

    def is_ready(self) -> bool:
        """Check whether the model artifact is loaded and ready for inference."""
        return self._is_trained and hasattr(self, "model")

    def fit(self, x: list[list[float]], y: list[str]) -> ClassicalSecretClassifier:
        """Train classifier on feature vectors and string labels."""
        self.model.fit(x, y)
        self._is_trained = True
        return self

    def predict_candidate(
        self,
        candidate: SecretCandidate,
        deterministic_score: float = 0.0,
    ) -> MLResult:
        """
        Run inference on a SecretCandidate.
        Calculates safe features and returns MLResult with probability distribution.
        """
        if not self._is_trained:
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
                error_message="Model is not trained or loaded",
            )

        start_time = time.perf_counter()
        feat_dict = self.extractor.extract_features(
            candidate, deterministic_score=deterministic_score
        )
        vector = [self.extractor.to_vector(feat_dict)]

        probabilities = self.model.predict_proba(vector)[0]
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        # Map classes to probabilities
        class_prob_map: dict[str, float] = {}
        for cls_name, prob in zip(self.model.classes_, probabilities, strict=False):
            class_prob_map[cls_name] = float(prob)

        p_real = class_prob_map.get("REAL_SECRET", 0.0)
        p_ph = class_prob_map.get("PLACEHOLDER_OR_EXAMPLE", 0.0)
        p_not = class_prob_map.get("NOT_SECRET", 0.0)

        # Argmax classification
        best_cls: SecretClassification = "NOT_SECRET"
        best_prob = p_not

        if p_real >= p_ph and p_real >= p_not:
            best_cls = "REAL_SECRET"
            best_prob = p_real
        elif p_ph >= p_real and p_ph >= p_not:
            best_cls = "PLACEHOLDER_OR_EXAMPLE"
            best_prob = p_ph
        else:
            best_cls = "NOT_SECRET"
            best_prob = p_not

        return MLResult(
            model_name=self.model_name,
            model_version=self.model_version,
            classification=best_cls,
            confidence=round(best_prob, 4),
            p_real_secret=round(p_real, 4),
            p_placeholder=round(p_ph, 4),
            p_not_secret=round(p_not, 4),
            inference_latency_ms=round(latency_ms, 3),
            is_available=True,
        )

    def save(self, artifact_dir: str) -> str:
        """Serialize model artifact and metadata to disk."""
        os.makedirs(artifact_dir, exist_ok=True)
        model_path = os.path.join(artifact_dir, "model.joblib")
        metadata_path = os.path.join(artifact_dir, "metadata.json")

        joblib.dump(self.model, model_path)
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2)

        return model_path

    @classmethod
    def load(cls, artifact_dir: str) -> ClassicalSecretClassifier:
        """Load model artifact and metadata from disk."""
        model_path = os.path.join(artifact_dir, "model.joblib")
        metadata_path = os.path.join(artifact_dir, "metadata.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found at {model_path}")

        meta: dict[str, Any] = {}
        if os.path.exists(metadata_path):
            with open(metadata_path, encoding="utf-8") as f:
                meta = json.load(f)

        instance = cls(
            model_type=meta.get("model_type", "random_forest"),
            model_name=meta.get("model_name", "rf-secret-classifier"),
            model_version=meta.get("model_version", "1.0.0"),
        )
        instance.model = joblib.load(model_path)
        instance._is_trained = True
        instance.metadata = meta
        return instance
