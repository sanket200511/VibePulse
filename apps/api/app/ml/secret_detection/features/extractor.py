"""
Feature extraction pipeline for secret candidate classification.

Extracts normalized numerical features from candidate strings and their context
without ever serializing or leaking the raw secret value.
"""

from __future__ import annotations

import math
from collections import Counter

from app.features.analysis.security.types import SecretCandidate

# High-risk variable / property name substrings
SENSITIVE_KEYWORDS: list[str] = [
    "secret",
    "password",
    "passwd",
    "pwd",
    "token",
    "auth",
    "apikey",
    "api_key",
    "access_key",
    "private_key",
    "client_secret",
    "credential",
    "bearer",
    "jwt",
    "database_url",
    "db_password",
    "session_key",
    "ssh_key",
]

# Obvious placeholder / dummy token substrings
PLACEHOLDER_SUBSTRINGS: list[str] = [
    "your_",
    "your-",
    "yourpassword",
    "changeme",
    "change_me",
    "changeit",
    "dummy",
    "example",
    "sample",
    "placeholder",
    "test_pass",
    "todo",
    "xxxx",
    "******",
    "...",
    "123456",
    "insert_",
    "<password>",
    "<api_key>",
    "<your_",
    "replace_me",
    "my_secret",
    "faketoken",
]

FEATURE_NAMES: list[str] = [
    "length",
    "entropy",
    "digit_ratio",
    "uppercase_ratio",
    "lowercase_ratio",
    "symbol_ratio",
    "hex_char_ratio",
    "base64_char_ratio",
    "keyword_score",
    "placeholder_heuristic_score",
    "has_assignment",
    "is_test",
    "is_example",
    "is_docs",
    "is_config",
    "deterministic_score",
]


def calculate_shannon_entropy(text: str) -> float:
    """Calculate Shannon entropy in bits per character."""
    if not text:
        return 0.0
    length = len(text)
    counts = Counter(text)
    entropy = 0.0
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def calculate_char_ratios(text: str) -> dict[str, float]:
    """Calculate character class ratios (digits, uppercase, lowercase, symbols)."""
    if not text:
        return {
            "digit_ratio": 0.0,
            "uppercase_ratio": 0.0,
            "lowercase_ratio": 0.0,
            "symbol_ratio": 0.0,
            "hex_char_ratio": 0.0,
            "base64_char_ratio": 0.0,
        }
    total = len(text)
    digits = sum(1 for c in text if c.isdigit())
    uppers = sum(1 for c in text if c.isupper())
    lowers = sum(1 for c in text if c.islower())
    hex_chars = sum(1 for c in text if c.lower() in "0123456789abcdef")
    base64_chars = sum(1 for c in text if c.isalnum() or c in "+/=")
    symbols = total - (digits + uppers + lowers)

    return {
        "digit_ratio": round(digits / total, 4),
        "uppercase_ratio": round(uppers / total, 4),
        "lowercase_ratio": round(lowers / total, 4),
        "symbol_ratio": round(symbols / total, 4),
        "hex_char_ratio": round(hex_chars / total, 4),
        "base64_char_ratio": round(base64_chars / total, 4),
    }


def calculate_keyword_score(variable_name: str) -> float:
    """Score how strongly a variable or property name indicates a secret."""
    if not variable_name:
        return 0.0
    var_lower = variable_name.lower().replace("-", "_")
    score = 0.0
    for kw in SENSITIVE_KEYWORDS:
        if kw in var_lower:
            score += 1.0
    return min(1.0, round(score, 4))


def calculate_placeholder_score(candidate_str: str, variable_name: str = "") -> float:
    """
    Score how likely the candidate is a placeholder/example value.
    Scores 0.0 (unlikely placeholder) to 1.0 (definite placeholder).
    """
    if not candidate_str:
        return 1.0
    clean = candidate_str.strip().lower()
    score = 0.0

    # Explicit template syntax like <YOUR_KEY>, ${KEY}, [KEY]
    if (clean.startswith("<") and clean.endswith(">")) or (
        clean.startswith("${") and clean.endswith("}")
    ):
        return 1.0
    if (clean.startswith("[") and clean.endswith("]")) or (
        clean.startswith("{") and clean.endswith("}")
    ):
        score += 0.8

    # Check substring matches
    for ph in PLACEHOLDER_SUBSTRINGS:
        if ph in clean:
            score += 0.8
            break

    # Check variable name indicators
    var_clean = variable_name.strip().lower()
    if any(p in var_clean for p in ["dummy", "example", "mock", "sample", "fake", "placeholder"]):
        score += 0.5

    # Low entropy repeated character sequences: "xxxx", "1111", "aaaa"
    if len(set(clean)) <= 2 and len(clean) > 3:
        score += 0.7

    return min(1.0, round(score, 4))


def categorize_path(file_path: str) -> str:
    """Categorize file path context."""
    normalized = "/" + file_path.replace("\\", "/").lower().lstrip("/")
    parts = normalized.split("/")
    filename = parts[-1] if parts else ""

    if any(
        p in normalized for p in ["/test/", "/tests/", "/spec/", "/__tests__/", "/testing/"]
    ) or filename.startswith(("test_", "spec_")):
        return "test"
    if any(p in normalized for p in ["/fixture/", "/fixtures/", "/mock/", "/mocks/", "/stub/"]):
        return "fixture"
    if any(p in normalized for p in ["/example/", "/examples/", "/demo/", "/sample/", "/samples/"]):
        return "example"
    if any(p in normalized for p in ["/doc/", "/docs/", "/documentation/"]) or filename.endswith(
        (".md", ".rst", ".txt")
    ):
        return "docs"
    if filename.startswith(".env") or any(
        cfg in filename for cfg in ["config", "settings", "secret", "credential"]
    ):
        return "config"
    return "production"


class FeatureExtractor:
    """Safe feature extractor that yields normalized feature vectors."""

    def __init__(self) -> None:
        self.feature_names = list(FEATURE_NAMES)

    def extract_features(
        self,
        candidate: SecretCandidate,
        deterministic_score: float = 0.0,
    ) -> dict[str, float]:
        """Extract a dictionary of numerical features from a SecretCandidate."""
        # In-memory candidate string used ONLY to compute remaining ratios and placeholder score
        ratios_all = calculate_char_ratios(candidate.raw_candidate_in_memory)

        kw_score = calculate_keyword_score(candidate.variable_name)
        ph_score = calculate_placeholder_score(
            candidate.raw_candidate_in_memory, candidate.variable_name
        )

        return {
            "length": float(candidate.length),
            "entropy": float(candidate.entropy),
            "digit_ratio": float(ratios_all["digit_ratio"]),
            "uppercase_ratio": float(ratios_all["uppercase_ratio"]),
            "lowercase_ratio": float(ratios_all["lowercase_ratio"]),
            "symbol_ratio": float(ratios_all["symbol_ratio"]),
            "hex_char_ratio": float(ratios_all["hex_char_ratio"]),
            "base64_char_ratio": float(ratios_all["base64_char_ratio"]),
            "keyword_score": float(kw_score),
            "placeholder_heuristic_score": float(ph_score),
            "has_assignment": 1.0 if candidate.has_assignment else 0.0,
            "is_test": 1.0 if candidate.path_category in ("test", "fixture") else 0.0,
            "is_example": 1.0 if candidate.path_category == "example" else 0.0,
            "is_docs": 1.0 if candidate.path_category == "docs" else 0.0,
            "is_config": 1.0 if candidate.path_category == "config" else 0.0,
            "deterministic_score": float(deterministic_score),
        }

    def to_vector(self, features: dict[str, float]) -> list[float]:
        """Convert feature dictionary to an ordered vector corresponding to FEATURE_NAMES."""
        return [features.get(name, 0.0) for name in self.feature_names]
