"""
Tests for ClassicalSecretClassifier.
Verifies training, prediction, artifact serialization, and missing model fallback.
"""

from __future__ import annotations

import os
import tempfile

from app.features.analysis.security.candidate import CandidateExtractor
from app.ml.secret_detection.models.classical import ClassicalSecretClassifier
from app.ml.secret_detection.models.transformer_adapter import ContextualTransformerClassifier


def test_classical_model_training_and_serialization():
    c_extractor = CandidateExtractor()
    cand1 = c_extractor.extract_from_lines(['api_key = "sk-demosecret1234567890abcdef"'], "app.py")[
        0
    ]
    cand2 = c_extractor.extract_from_lines(['token = "YOUR_API_KEY_HERE"'], "docs.md")[0]
    cand3 = c_extractor.extract_from_lines(
        ['uuid = "c9bf9e57-1685-4c89-bafb-ff5af830be8a"'], "models.py"
    )[0]

    classifier = ClassicalSecretClassifier(model_type="random_forest", random_state=42)
    feat1 = classifier.extractor.to_vector(classifier.extractor.extract_features(cand1, 0.9))
    feat2 = classifier.extractor.to_vector(classifier.extractor.extract_features(cand2, 0.5))
    feat3 = classifier.extractor.to_vector(classifier.extractor.extract_features(cand3, 0.0))

    x = [feat1, feat2, feat3] * 10
    y = ["REAL_SECRET", "PLACEHOLDER_OR_EXAMPLE", "NOT_SECRET"] * 10

    classifier.fit(x, y)

    res = classifier.predict_candidate(cand1, deterministic_score=0.9)
    assert res.is_available is True
    assert res.classification in ("REAL_SECRET", "PLACEHOLDER_OR_EXAMPLE", "NOT_SECRET")
    assert res.inference_latency_ms >= 0.0
    assert round(res.p_real_secret + res.p_placeholder + res.p_not_secret, 2) == 1.0

    # Test serialization to temporary directory
    with tempfile.TemporaryDirectory() as tmpdir:
        saved_file = classifier.save(tmpdir)
        assert os.path.exists(saved_file)
        assert os.path.exists(os.path.join(tmpdir, "metadata.json"))

        loaded = ClassicalSecretClassifier.load(tmpdir)
        res_loaded = loaded.predict_candidate(cand1, deterministic_score=0.9)
        assert res_loaded.classification == res.classification


def test_transformer_adapter_readiness_probe():
    adapter = ContextualTransformerClassifier()
    # In lightweight test environment without PyTorch/weights, must report NOT_AVAILABLE
    assert adapter.is_available() is False
    c_extractor = CandidateExtractor()
    cand = c_extractor.extract_from_lines(['api_key = "12345678"'], "f.py")[0]
    res = adapter.predict_candidate(cand)

    assert res.is_available is False
    assert "NOT_AVAILABLE" in (res.error_message or "")
