"""
Training pipeline for classical secret classification model.

Loads grouped synthetic dataset, trains ClassicalSecretClassifier,
validates performance, and serializes artifact to disk.
"""

from __future__ import annotations

import argparse
import os

from app.ml.secret_detection.dataset.loader import DatasetPipeline
from app.ml.secret_detection.models.classical import ClassicalSecretClassifier

DEFAULT_ARTIFACT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "artifacts",
    "secret-classifier",
)


def train_model(
    artifact_dir: str = DEFAULT_ARTIFACT_DIR,
    model_type: str = "random_forest",
    model_version: str = "1.0.0",
    seed: int = 42,
) -> str:
    """Train and persist secret classification model."""
    print(f"[*] Initializing dataset pipeline with seed={seed}...")
    pipeline = DatasetPipeline(seed=seed)
    train_items, val_items, test_items = pipeline.get_dataset()

    print(
        f"[*] Dataset split (grouped by repo/file): "
        f"Train={len(train_items)}, Val={len(val_items)}, Test={len(test_items)}"
    )

    x_train, y_train = pipeline.prepare_feature_matrix(train_items)
    x_val, y_val = pipeline.prepare_feature_matrix(val_items)

    print(f"[*] Training {model_type} model on {len(x_train)} samples...")
    classifier = ClassicalSecretClassifier(
        model_type=model_type,
        model_version=model_version,
        random_state=seed,
    )
    classifier.fit(x_train, y_train)

    # Basic validation check
    val_preds = classifier.model.predict(x_val)
    val_acc = sum(1 for p, y in zip(val_preds, y_val, strict=False) if p == y) / max(1, len(y_val))
    print(f"[+] Validation Accuracy: {val_acc:.4f}")

    print(f"[*] Serializing model artifact to {artifact_dir}...")
    saved_path = classifier.save(artifact_dir)
    print(f"[+] Model successfully saved to {saved_path}")
    return saved_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train VibePulse Secret Classifier")
    parser.add_argument(
        "--artifact-dir", default=DEFAULT_ARTIFACT_DIR, help="Destination directory"
    )
    parser.add_argument(
        "--model-type", default="random_forest", choices=["random_forest", "hist_gradient_boosting"]
    )
    parser.add_argument("--version", default="1.0.0")
    args = parser.parse_args()

    train_model(
        artifact_dir=args.artifact_dir,
        model_type=args.model_type,
        model_version=args.version,
    )
