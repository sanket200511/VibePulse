"""
Unit tests for the four lightweight analyzers.

These tests are pure Python — no database, no HTTP client needed.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.analysis.analyzers.activity_rate import ActivityRateAnalyzer
from app.features.analysis.analyzers.file_metadata import FileMetadataAnalyzer
from app.features.analysis.analyzers.git_context import GitContextAnalyzer
from app.features.analysis.analyzers.language import LanguageAnalyzer
from app.features.analysis.base import AnalysisContext, SessionActivityContext

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _event(**kwargs: object) -> AnalyzableEvent:
    defaults: dict = {
        "id": uuid.uuid4(),
        "event_type": "FILE_MODIFIED",
        "timestamp": datetime.now(UTC),
        "session_id": uuid.uuid4(),
        "project_root": "/repo",
        "file_path": "/repo/src/app.py",
        "file_name": "app.py",
        "file_extension": ".py",
        "language": None,
        "git_branch": "feat/new-feature",
        "metadata": {},
    }
    defaults.update(kwargs)
    return AnalyzableEvent(**defaults)


def _ctx(events_5min: int = 3, events_hour: int = 20) -> AnalysisContext:
    return AnalysisContext(
        session_activity=SessionActivityContext(
            events_last_5min=events_5min,
            events_last_hour=events_hour,
        )
    )


# ---------------------------------------------------------------------------
# LanguageAnalyzer
# ---------------------------------------------------------------------------


class TestLanguageAnalyzer:
    analyzer = LanguageAnalyzer()

    def test_python_extension(self) -> None:
        finding = self.analyzer.analyze(_event(file_extension=".py"), _ctx())
        assert finding is not None
        assert finding.findings["detected_language"] == "python"
        assert finding.findings["file_category"] == "source"
        assert finding.findings["is_source_file"] is True
        assert finding.findings["confidence"] == "extension"

    def test_typescript_extension(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_extension=".tsx", file_name="Component.tsx"), _ctx()
        )
        assert finding is not None
        assert finding.findings["detected_language"] == "typescript"

    def test_language_hint_takes_priority(self) -> None:
        finding = self.analyzer.analyze(_event(file_extension=".py", language="python"), _ctx())
        assert finding is not None
        assert finding.findings["confidence"] == "inferred"

    def test_config_file(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_extension=".yaml", file_name="config.yaml"), _ctx()
        )
        assert finding is not None
        assert finding.findings["file_category"] == "config"
        assert finding.findings["is_source_file"] is False

    def test_docs_file(self) -> None:
        finding = self.analyzer.analyze(_event(file_extension=".md", file_name="README.md"), _ctx())
        assert finding is not None
        assert finding.findings["file_category"] == "docs"

    def test_unknown_extension(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_extension=".xyzzy", file_name="foo.xyzzy"), _ctx()
        )
        assert finding is not None
        assert finding.findings["file_category"] == "unknown"
        assert finding.findings["confidence"] == "none"
        assert finding.findings["detected_language"] is None

    def test_no_extension(self) -> None:
        finding = self.analyzer.analyze(_event(file_extension=None, file_name="Makefile"), _ctx())
        assert finding is not None
        assert finding.findings["file_category"] == "unknown"

    def test_metadata(self) -> None:
        assert self.analyzer.name == "language"
        assert self.analyzer.version == 1
        assert self.analyzer.enabled is True
        assert self.analyzer.priority == 10


# ---------------------------------------------------------------------------
# FileMetadataAnalyzer
# ---------------------------------------------------------------------------


class TestFileMetadataAnalyzer:
    analyzer = FileMetadataAnalyzer()

    def test_path_depth(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_path="/repo/src/app.py", file_name="app.py"), _ctx()
        )
        assert finding is not None
        assert finding.findings["path_depth"] == 3  # repo, src, app.py

    def test_directory(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_path="/repo/src/app.py", file_name="app.py"), _ctx()
        )
        assert finding is not None
        assert finding.findings["directory"] == "src"

    def test_is_test_file_by_directory(self) -> None:
        finding = self.analyzer.analyze(
            _event(
                file_path="/repo/tests/test_app.py",
                file_name="test_app.py",
            ),
            _ctx(),
        )
        assert finding is not None
        assert finding.findings["is_test_file"] is True

    def test_is_test_file_by_stem(self) -> None:
        finding = self.analyzer.analyze(
            _event(
                file_path="/repo/src/app.test.ts",
                file_name="app.test.ts",
            ),
            _ctx(),
        )
        assert finding is not None
        assert finding.findings["is_test_file"] is True

    def test_is_not_test_file(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_path="/repo/src/app.py", file_name="app.py"), _ctx()
        )
        assert finding is not None
        assert finding.findings["is_test_file"] is False

    def test_is_config_file_by_extension(self) -> None:
        finding = self.analyzer.analyze(
            _event(
                file_path="/repo/config.yaml",
                file_name="config.yaml",
                file_extension=".yaml",
            ),
            _ctx(),
        )
        assert finding is not None
        assert finding.findings["is_config_file"] is True

    def test_is_hidden(self) -> None:
        finding = self.analyzer.analyze(
            _event(
                file_path="/repo/.env",
                file_name=".env",
            ),
            _ctx(),
        )
        assert finding is not None
        assert finding.findings["is_hidden"] is True

    def test_not_hidden(self) -> None:
        finding = self.analyzer.analyze(
            _event(file_path="/repo/src/app.py", file_name="app.py"), _ctx()
        )
        assert finding is not None
        assert finding.findings["is_hidden"] is False

    def test_metadata(self) -> None:
        assert self.analyzer.name == "file_metadata"
        assert self.analyzer.priority == 20


# ---------------------------------------------------------------------------
# GitContextAnalyzer
# ---------------------------------------------------------------------------


class TestGitContextAnalyzer:
    analyzer = GitContextAnalyzer()

    @pytest.mark.parametrize(
        ("branch", "expected_type", "expected_prefix"),
        [
            ("feat/add-login", "feature", "feat"),
            ("feature/new-ui", "feature", "feature"),
            ("fix/null-pointer", "fix", "fix"),
            ("bugfix/crash", "fix", "bugfix"),
            ("hotfix/security", "fix", "hotfix"),
            ("release/1.2.0", "release", "release"),
            ("chore/update-deps", "chore", "chore"),
            ("docs/readme", "docs", "docs"),
            ("test/add-coverage", "test", "test"),
            ("refactor/clean-up", "refactor", "refactor"),
            ("perf/db-query", "perf", "perf"),
        ],
    )
    def test_branch_types(self, branch: str, expected_type: str, expected_prefix: str) -> None:
        finding = self.analyzer.analyze(_event(git_branch=branch), _ctx())
        assert finding is not None
        assert finding.findings["branch_type"] == expected_type
        assert finding.findings["branch_prefix"] == expected_prefix

    @pytest.mark.parametrize("branch", ["main", "master", "develop"])
    def test_main_branches(self, branch: str) -> None:
        finding = self.analyzer.analyze(_event(git_branch=branch), _ctx())
        assert finding is not None
        assert finding.findings["branch_type"] == "main"
        assert finding.findings["branch_prefix"] is None

    def test_detached_head(self) -> None:
        finding = self.analyzer.analyze(_event(git_branch="HEAD"), _ctx())
        assert finding is not None
        assert finding.findings["branch_type"] == "detached"

    def test_unknown_branch(self) -> None:
        finding = self.analyzer.analyze(_event(git_branch="my-random-branch"), _ctx())
        assert finding is not None
        assert finding.findings["branch_type"] == "unknown"

    def test_no_branch(self) -> None:
        finding = self.analyzer.analyze(_event(git_branch=None), _ctx())
        assert finding is not None
        assert finding.findings["branch_type"] == "unknown"
        assert finding.findings["branch_prefix"] is None

    def test_metadata(self) -> None:
        assert self.analyzer.name == "git_context"
        assert self.analyzer.priority == 30


# ---------------------------------------------------------------------------
# ActivityRateAnalyzer
# ---------------------------------------------------------------------------


class TestActivityRateAnalyzer:
    analyzer = ActivityRateAnalyzer()

    def test_normal_activity(self) -> None:
        finding = self.analyzer.analyze(_event(), _ctx(events_5min=5, events_hour=30))
        assert finding is not None
        assert finding.findings["events_last_5min"] == 5
        assert finding.findings["events_last_hour"] == 30
        assert finding.findings["events_per_minute"] == 1.0
        assert finding.findings["is_burst"] is False

    def test_burst_activity(self) -> None:
        finding = self.analyzer.analyze(_event(), _ctx(events_5min=60, events_hour=120))
        assert finding is not None
        assert finding.findings["events_per_minute"] == 12.0
        assert finding.findings["is_burst"] is True

    def test_zero_activity(self) -> None:
        finding = self.analyzer.analyze(_event(), _ctx(events_5min=0, events_hour=0))
        assert finding is not None
        assert finding.findings["events_per_minute"] == 0.0
        assert finding.findings["is_burst"] is False

    def test_metadata(self) -> None:
        assert self.analyzer.name == "activity_rate"
        assert self.analyzer.priority == 40
