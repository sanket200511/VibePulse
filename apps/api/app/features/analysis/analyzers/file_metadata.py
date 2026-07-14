"""
File metadata analyzer — extracts structural information from the file path.

Findings schema
---------------
{
    "path_depth": int,         # number of path components (e.g. src/a/b.py → 3)
    "directory": str,          # immediate parent directory name
    "is_test_file": bool,      # True when path suggests a test file
    "is_config_file": bool,    # True when path suggests a config file
    "is_hidden": bool,         # True when file or any parent starts with "."
}
"""

from __future__ import annotations

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding

# Path segments that strongly suggest a test file.
_TEST_INDICATORS: frozenset[str] = frozenset(
    {
        "test",
        "tests",
        "spec",
        "specs",
        "__tests__",
        "__mocks__",
        "e2e",
        "integration",
        "unit",
        "fixtures",
    }
)

# File name stems that strongly suggest configuration.
_CONFIG_NAME_INDICATORS: frozenset[str] = frozenset(
    {
        "config",
        "configuration",
        "settings",
        "setup",
        "options",
        "defaults",
        ".env",
        "env",
    }
)

# Extensions that are almost always configuration.
_CONFIG_EXTENSIONS: frozenset[str] = frozenset(
    {"json", "yaml", "yml", "toml", "ini", "cfg", "conf", "env", "properties"}
)


def _is_test_file(path: str, file_name: str) -> bool:
    """Return True when any path component or the file stem signals tests."""
    parts = path.replace("\\", "/").split("/")
    # Check directory components.
    for part in parts[:-1]:
        if part.lower() in _TEST_INDICATORS:
            return True
    # Check file name stem (e.g. "test_foo.py", "foo.test.ts", "foo.spec.js").
    stem = file_name.rsplit(".", 1)[0].lower()
    if stem.startswith("test_") or stem.endswith(("_test", ".test", ".spec")):
        return True
    name_lower = file_name.lower()
    if name_lower.startswith("test") or name_lower.endswith(
        (".test.ts", ".test.js", ".spec.ts", ".spec.js", ".test.tsx", ".spec.tsx")
    ):
        return True
    return False


def _is_config_file(path: str, file_name: str, extension: str | None) -> bool:
    """Return True when the file name or extension strongly implies config."""
    ext = (extension or "").lower().lstrip(".")
    if ext in _CONFIG_EXTENSIONS:
        return True
    stem = file_name.rsplit(".", 1)[0].lower()
    for indicator in _CONFIG_NAME_INDICATORS:
        if indicator in stem:
            return True
    return False


def _is_hidden(path: str) -> bool:
    """Return True when the file itself or any parent directory is hidden."""
    parts = path.replace("\\", "/").split("/")
    return any(p.startswith(".") for p in parts if p)


class FileMetadataAnalyzer:
    """
    Extract structural metadata from the file path.

    Findings
    --------
    path_depth    : int   - number of path segments
    directory     : str   - immediate parent directory name
    is_test_file  : bool
    is_config_file: bool
    is_hidden     : bool
    """

    name = "file_metadata"
    version = 1
    description = "Extracts structural metadata from the changed file path."
    priority = 20
    enabled = True

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        if not event.file_path or not event.file_name:
            return None

        # Normalise to forward slashes for cross-platform consistency.
        norm_path = event.file_path.replace("\\", "/")
        parts = [p for p in norm_path.split("/") if p]
        path_depth = len(parts)
        directory = parts[-2] if path_depth >= 2 else (parts[0] if parts else "")

        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={
                "path_depth": path_depth,
                "directory": directory,
                "is_test_file": _is_test_file(norm_path, event.file_name),
                "is_config_file": _is_config_file(norm_path, event.file_name, event.file_extension),
                "is_hidden": _is_hidden(norm_path),
            },
        )
