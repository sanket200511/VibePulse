"""
Git context analyzer — classifies the current git branch.

Findings schema
---------------
{
    "branch_type": str,     # "feature" | "fix" | "release" | "chore" |
                            #  "docs" | "test" | "refactor" | "perf" |
                            #  "main" | "detached" | "unknown"
    "branch_prefix": str | None,  # e.g. "feat", "fix", None
}
"""

from __future__ import annotations

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding

# Branch name prefixes that match Conventional Commits / common team patterns.
_PREFIX_TO_TYPE: dict[str, str] = {
    # Feature
    "feat": "feature",
    "feature": "feature",
    "ft": "feature",
    # Bug fix
    "fix": "fix",
    "bugfix": "fix",
    "bug": "fix",
    "hotfix": "fix",
    # Release
    "release": "release",
    "rel": "release",
    # Chore / maintenance
    "chore": "chore",
    "ch": "chore",
    # Documentation
    "docs": "docs",
    "doc": "docs",
    # Tests
    "test": "test",
    "tests": "test",
    # Refactor
    "refactor": "refactor",
    "refact": "refactor",
    "rf": "refactor",
    # Performance
    "perf": "perf",
    "performance": "perf",
}

# Branch names that represent the main integration line.
_MAIN_BRANCHES: frozenset[str] = frozenset({"main", "master", "trunk", "develop", "development"})

_DETACHED_SENTINEL = "HEAD"


def _classify_branch(branch: str | None) -> tuple[str, str | None]:
    """Return (branch_type, branch_prefix)."""
    if branch is None:
        return "unknown", None

    stripped = branch.strip()

    if stripped == _DETACHED_SENTINEL:
        return "detached", None

    if stripped.lower() in _MAIN_BRANCHES:
        return "main", None

    # Attempt prefix matching: "feat/my-thing" → prefix="feat", type="feature"
    if "/" in stripped:
        prefix = stripped.split("/", 1)[0].lower()
        branch_type = _PREFIX_TO_TYPE.get(prefix)
        if branch_type:
            return branch_type, prefix

    # Try the full branch name as a prefix (e.g. branch named "chore-update-deps").
    for prefix, branch_type in _PREFIX_TO_TYPE.items():
        if stripped.lower().startswith(prefix):
            return branch_type, prefix

    return "unknown", None


class GitContextAnalyzer:
    """
    Classify the current git branch and extract its prefix.

    Findings
    --------
    branch_type   : str         - semantic category of the branch
    branch_prefix : str | None  - the raw prefix extracted from the branch name
    """

    name = "git_context"
    version = 1
    description = "Classifies the git branch type from its name."
    priority = 30
    enabled = True

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        branch_type, branch_prefix = _classify_branch(event.git_branch)
        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={
                "branch_type": branch_type,
                "branch_prefix": branch_prefix,
            },
        )
