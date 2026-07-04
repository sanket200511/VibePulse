"""
Language analyzer — classifies the programming language of the changed file.

Findings schema
---------------
{
    "file_category": str,      # "source" | "markup" | "config" | "data" |
                               #  "docs" | "binary" | "unknown"
    "is_source_file": bool,    # True when file_category == "source"
    "confidence": str,         # "extension" | "inferred" | "none"
    "detected_language": str | None  # e.g. "python", "typescript", None
}
"""

from __future__ import annotations

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding

# ---------------------------------------------------------------------------
# Extension → (language, category) mappings
# ---------------------------------------------------------------------------

_SOURCE_EXTENSIONS: dict[str, str] = {
    # Python
    "py": "python",
    "pyi": "python",
    # TypeScript / JavaScript
    "ts": "typescript",
    "tsx": "typescript",
    "js": "javascript",
    "jsx": "javascript",
    "mjs": "javascript",
    "cjs": "javascript",
    # Rust
    "rs": "rust",
    # Go
    "go": "go",
    # Java / Kotlin / Scala
    "java": "java",
    "kt": "kotlin",
    "kts": "kotlin",
    "scala": "scala",
    # C / C++
    "c": "c",
    "h": "c",
    "cpp": "cpp",
    "cc": "cpp",
    "cxx": "cpp",
    "hpp": "cpp",
    # C#
    "cs": "csharp",
    # Ruby
    "rb": "ruby",
    # Swift
    "swift": "swift",
    # PHP
    "php": "php",
    # Shell
    "sh": "shell",
    "bash": "shell",
    "zsh": "shell",
    "fish": "shell",
    # Lua
    "lua": "lua",
    # R
    "r": "r",
    # Dart
    "dart": "dart",
    # Elixir / Erlang
    "ex": "elixir",
    "exs": "elixir",
    "erl": "erlang",
    # Haskell
    "hs": "haskell",
    "lhs": "haskell",
    # Clojure
    "clj": "clojure",
    "cljs": "clojure",
    "cljc": "clojure",
    # Scala
    "sc": "scala",
    # SQL
    "sql": "sql",
    # Other
    "tf": "hcl",
    "hcl": "hcl",
}

_MARKUP_EXTENSIONS: frozenset[str] = frozenset(
    {"html", "htm", "xml", "svg", "xhtml", "vue", "svelte"}
)

_CONFIG_EXTENSIONS: frozenset[str] = frozenset(
    {
        "json",
        "jsonc",
        "json5",
        "yaml",
        "yml",
        "toml",
        "ini",
        "cfg",
        "conf",
        "env",
        "properties",
        "lock",
        "editorconfig",
    }
)

_DOCS_EXTENSIONS: frozenset[str] = frozenset({"md", "mdx", "rst", "txt", "adoc", "tex"})

_DATA_EXTENSIONS: frozenset[str] = frozenset({"csv", "tsv", "parquet", "avro", "ndjson", "jsonl"})

_BINARY_EXTENSIONS: frozenset[str] = frozenset(
    {
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "ico",
        "svg",
        "pdf",
        "zip",
        "tar",
        "gz",
        "exe",
        "dll",
        "so",
        "dylib",
        "wasm",
        "ttf",
        "otf",
        "woff",
        "woff2",
        "mp3",
        "mp4",
        "wav",
    }
)


def _classify(
    ext: str | None,
    language_hint: str | None,
) -> tuple[str, str, str | None]:
    """
    Return (file_category, confidence, detected_language).

    Priority: explicit ``language`` field on the event → file extension.
    """
    if language_hint:
        # The daemon already detected the language via editor metadata.
        return "source", "inferred", language_hint.lower()

    if ext is None:
        return "unknown", "none", None

    low = ext.lower().lstrip(".")

    if low in _SOURCE_EXTENSIONS:
        return "source", "extension", _SOURCE_EXTENSIONS[low]
    if low in _MARKUP_EXTENSIONS:
        return "markup", "extension", None
    if low in _CONFIG_EXTENSIONS:
        return "config", "extension", None
    if low in _DOCS_EXTENSIONS:
        return "docs", "extension", None
    if low in _DATA_EXTENSIONS:
        return "data", "extension", None
    if low in _BINARY_EXTENSIONS:
        return "binary", "extension", None

    return "unknown", "none", None


class LanguageAnalyzer:
    """
    Classify the file's programming language from its extension or metadata.

    Findings
    --------
    file_category     : str   - broad file kind
    is_source_file    : bool  - True when category is "source"
    confidence        : str   - "extension" | "inferred" | "none"
    detected_language : str | None
    """

    name = "language"
    version = 1
    description = "Classifies the file's programming language."
    priority = 10
    enabled = True

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        category, confidence, detected_language = _classify(
            event.file_extension,
            event.language,
        )
        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={
                "file_category": category,
                "is_source_file": category == "source",
                "confidence": confidence,
                "detected_language": detected_language,
            },
        )
