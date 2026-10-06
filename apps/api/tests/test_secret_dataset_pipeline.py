"""
Tests for Secret Dataset Pipeline.
Verifies grouped repository/file splitting to prevent data leakage, and SecretBench adapter.
"""

from __future__ import annotations

from app.ml.secret_detection.dataset.loader import (
    DatasetPipeline,
    SecretBenchAdapter,
)


def test_grouped_splitting_prevents_leakage():
    pipeline = DatasetPipeline(seed=42)
    train_items, val_items, test_items = pipeline.get_dataset(
        train_ratio=0.7, val_ratio=0.15, test_ratio=0.15
    )

    train_groups = {it.group_id for it in train_items}
    val_groups = {it.group_id for it in val_items}
    test_groups = {it.group_id for it in test_items}

    # CRITICAL: Intersection of group IDs across splits must be strictly EMPTY
    assert train_groups.isdisjoint(val_groups)
    assert train_groups.isdisjoint(test_groups)
    assert val_groups.isdisjoint(test_groups)

    # Verify all 3 classes exist in train, val, and test
    for split_items in (train_items, val_items, test_items):
        labels = {it.label for it in split_items}
        assert "REAL_SECRET" in labels
        assert "PLACEHOLDER_OR_EXAMPLE" in labels
        assert "NOT_SECRET" in labels


def test_secretbench_adapter_fallback():
    # When no local path is provided or directory does not exist
    adapter = SecretBenchAdapter("/nonexistent/path/secretbench")
    assert adapter.is_available() is False
    assert adapter.load_dataset() == []
