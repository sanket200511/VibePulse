"""
Candidate extraction layer for secret detection.

Extracts potential secret candidates from source code lines and files,
building structured candidate representations with safe redacted context.

CRITICAL INVARIANT:
The raw secret string is accessible ONLY in-memory in `raw_candidate_in_memory`
during extraction/classification, and is NEVER serialized into dicts, logs, or DB.
"""

from __future__ import annotations

import os
import re
from typing import Any

from app.features.analysis.security.types import SecretCandidate
from app.ml.secret_detection.features.extractor import (
    calculate_char_ratios,
    calculate_shannon_entropy,
    categorize_path,
)

# Common assignment pattern across Python, TS/JS, JSON, YAML, .env
ASSIGNMENT_PATTERN = re.compile(
    r"""(?ix)
    (?P<prefix>
        (?:^|[\s,;{\[(])
        (?:const\s+|let\s+|var\s+|export\s+)?
        (?P<quote1>["'])?
        (?P<key>[a-zA-Z0-9_\-\.]{1,50})
        (?P=quote1)?

        \s*(?:=|:|:=)\s*
    )
    (?:
        (?P<qval>["'])(?P<val_quoted>[^"'\r\n]*)(?P=qval)
        |
        (?P<val_unquoted>[^\s#"';,}\]\r\n]+)
    )
    """
)

# Standalone high-entropy / bearer-token / key patterns outside direct assignment
STANDALONE_TOKEN_PATTERN = re.compile(
    r"""(?x)
    \b(
        sk-[a-zA-Z0-9_\-]{20,80}
        |
        AKIA[0-9A-Z]{16}
        |
        ghp_[a-zA-Z0-9]{36}
        |
        gho_[a-zA-Z0-9]{36}
        |
        glpat-[a-zA-Z0-9\-]{20,50}
        |
        xox[baprs]-[0-9a-zA-Z]{10,48}
    )\b
    """
)


def extract_redacted_context(lines: list[str], target_line_idx: int, radius: int = 1) -> str:
    """Extract a 3-line context window where sensitive assignments are scrubbed to [REDACTED]."""
    start = max(0, target_line_idx - radius)
    end = min(len(lines), target_line_idx + radius + 1)
    window_lines: list[str] = []

    for idx in range(start, end):
        raw_l = lines[idx].rstrip("\r\n")
        # Scrub assignment values
        scrubbed = ASSIGNMENT_PATTERN.sub(r'\g<prefix>"[REDACTED]"', raw_l)
        scrubbed = STANDALONE_TOKEN_PATTERN.sub("[REDACTED_TOKEN]", scrubbed)
        window_lines.append(f"{idx + 1}: {scrubbed}")

    return "\n".join(window_lines)


class CandidateExtractor:
    """Extracts candidate strings from source code lines."""

    def __init__(self, min_candidate_length: int = 6) -> None:
        self.min_candidate_length = min_candidate_length

    def extract_from_lines(
        self,
        lines: list[str],
        file_path: str,
    ) -> list[SecretCandidate]:
        """Extract candidate strings and context from a list of source lines."""
        candidates: list[SecretCandidate] = []
        ext = os.path.splitext(file_path)[1].lower() or "txt"
        path_cat = categorize_path(file_path)

        for line_idx, line in enumerate(lines):
            line_str = line.strip()
            # Skip pure comments
            if line_str.startswith(("#", "//", "/*", "*", "<!--")):
                continue

            # 1. Check direct assignments
            for match in ASSIGNMENT_PATTERN.finditer(line):
                val = match.group("val_quoted") or match.group("val_unquoted") or ""
                key = match.group("key") or ""

                if len(val) < self.min_candidate_length:
                    continue

                ratios = calculate_char_ratios(val)
                entropy = calculate_shannon_entropy(val)
                redacted_ctx = extract_redacted_context(lines, line_idx)

                candidates.append(
                    SecretCandidate(
                        line_number=line_idx + 1,
                        variable_name=key,
                        file_path=file_path,
                        file_type=ext.lstrip("."),
                        path_category=path_cat,  # type: ignore[arg-type]
                        has_assignment=True,
                        context_window_redacted=redacted_ctx,
                        length=len(val),
                        entropy=entropy,
                        digit_ratio=ratios["digit_ratio"],
                        uppercase_ratio=ratios["uppercase_ratio"],
                        symbol_ratio=ratios["symbol_ratio"],
                        raw_candidate_in_memory=val,
                    )
                )

            # 2. Check standalone provider patterns
            for match in STANDALONE_TOKEN_PATTERN.finditer(line):
                token_val = match.group(1)
                ratios = calculate_char_ratios(token_val)
                entropy = calculate_shannon_entropy(token_val)
                redacted_ctx = extract_redacted_context(lines, line_idx)

                candidates.append(
                    SecretCandidate(
                        line_number=line_idx + 1,
                        variable_name="standalone_token",
                        file_path=file_path,
                        file_type=ext.lstrip("."),
                        path_category=path_cat,  # type: ignore[arg-type]
                        has_assignment=False,
                        context_window_redacted=redacted_ctx,
                        length=len(token_val),
                        entropy=entropy,
                        digit_ratio=ratios["digit_ratio"],
                        uppercase_ratio=ratios["uppercase_ratio"],
                        symbol_ratio=ratios["symbol_ratio"],
                        raw_candidate_in_memory=token_val,
                    )
                )

        return candidates

    @staticmethod
    def to_safe_dict(candidate: SecretCandidate) -> dict[str, Any]:
        """
        Convert candidate to safe dictionary for logging or diagnostics.
        NEVER includes raw_candidate_in_memory.
        """
        return {
            "line_number": candidate.line_number,
            "variable_name": candidate.variable_name,
            "file_path": candidate.file_path,
            "file_type": candidate.file_type,
            "path_category": candidate.path_category,
            "has_assignment": candidate.has_assignment,
            "length": candidate.length,
            "entropy": candidate.entropy,
            "digit_ratio": candidate.digit_ratio,
            "uppercase_ratio": candidate.uppercase_ratio,
            "symbol_ratio": candidate.symbol_ratio,
            "context_window_redacted": candidate.context_window_redacted,
        }
