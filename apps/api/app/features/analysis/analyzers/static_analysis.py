"""
Static analysis engine — extracts structural facts via AST parsing.

Supports Python and TypeScript/JavaScript.

Findings schema
---------------
{
    "line_count": int,
    "file_size": int,
    "functions": list[str],
    "classes": list[str],
    "imports": list[str],
    "todos": list[str],
    "functions_added": int,
    "functions_removed": int,
    "classes_added": int,
    "classes_removed": int,
    "imports_added": int,
    "imports_removed": int,
}
"""

from __future__ import annotations

import os

import tree_sitter_python
import tree_sitter_typescript
from tree_sitter import Language, Node, Parser

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding

# Initialize Parsers once
_PY_LANG = Language(tree_sitter_python.language())
_TS_LANG = Language(tree_sitter_typescript.language_typescript())

_PARSER_PY = Parser(_PY_LANG)
_PARSER_TS = Parser(_TS_LANG)


def _walk_ast(node: Node, results: dict[str, list[str]], lang: str) -> None:
    if lang == "python":
        if node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            if name_node and name_node.text:
                results["functions"].append(name_node.text.decode("utf8", errors="ignore"))
        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            if name_node and name_node.text:
                results["classes"].append(name_node.text.decode("utf8", errors="ignore"))
        elif node.type == "import_statement" or node.type == "import_from_statement":
            if node.text:
                results["imports"].append(node.text.decode("utf8", errors="ignore").strip())
        elif node.type == "comment" and node.text:
            text = node.text.decode("utf8", errors="ignore")
            if "TODO" in text or "FIXME" in text:
                results["todos"].append(text.strip())

    elif lang == "typescript":
        if node.type in ("function_declaration", "method_definition"):
            name_node = node.child_by_field_name("name")
            if name_node and name_node.text:
                results["functions"].append(name_node.text.decode("utf8", errors="ignore"))
        elif node.type == "lexical_declaration" or node.type == "variable_declaration":
            # Extract arrow functions if possible
            for child in node.children:
                if child.type == "variable_declarator":
                    val = child.child_by_field_name("value")
                    if val and val.type == "arrow_function":
                        name_node = child.child_by_field_name("name")
                        if name_node and name_node.text:
                            func_name = name_node.text.decode("utf8", errors="ignore")
                            results["functions"].append(func_name)
        elif node.type == "class_declaration":
            name_node = node.child_by_field_name("name")
            if name_node and name_node.text:
                results["classes"].append(name_node.text.decode("utf8", errors="ignore"))
        elif node.type == "import_statement" and node.text:
            results["imports"].append(node.text.decode("utf8", errors="ignore").strip())
        elif node.type == "comment" and node.text:
            text = node.text.decode("utf8", errors="ignore")
            if "TODO" in text or "FIXME" in text:
                results["todos"].append(text.strip())

    for child in node.children:
        _walk_ast(child, results, lang)


def _compute_diff_count(current: list[str], previous: list[str]) -> tuple[int, int]:
    """Returns (added, removed) counts."""
    curr_set = set(current)
    prev_set = set(previous)
    added = len(curr_set - prev_set)
    removed = len(prev_set - curr_set)
    return added, removed


class StaticAnalysisAnalyzer:
    """
    Parses code using tree-sitter to extract deterministic structural facts.
    """

    name = "static_analysis"
    version = 1
    description = "Extracts functions, classes, imports, and TODOs via AST parsing."
    priority = 50
    enabled = True

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        if event.event_type not in ("FILE_CREATED", "FILE_MODIFIED"):
            return None

        if not event.file_path or not event.project_root:
            return None

        # Determine language (simplified mapping)
        ext = (event.file_extension or "").lower()
        lang = None
        parser = None
        if ext in (".py",):
            lang = "python"
            parser = _PARSER_PY
        elif ext in (".ts", ".tsx", ".js", ".jsx"):
            lang = "typescript"
            parser = _PARSER_TS

        if not parser:
            return None

        # Resolve file path
        # In this implementation, event.file_path is absolute from the normaliser.
        # But we will use os.path.join just in case it's relative.
        if os.path.isabs(event.file_path):
            full_path = event.file_path
        else:
            full_path = os.path.join(event.project_root, event.file_path)

        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None

        try:
            with open(full_path, "rb") as f:
                content = f.read()
        except OSError:
            return None

        tree = parser.parse(content)

        results: dict[str, list[str]] = {"functions": [], "classes": [], "imports": [], "todos": []}

        if lang:
            _walk_ast(tree.root_node, results, lang)

        # Calculate line count and file size
        line_count = len(content.splitlines())
        file_size = len(content)

        # Get previous finding for deltas
        prev = context.previous_findings.get(self.name, {})
        prev_functions = prev.get("functions", [])
        prev_classes = prev.get("classes", [])
        prev_imports = prev.get("imports", [])

        funcs_added, funcs_removed = _compute_diff_count(results["functions"], prev_functions)
        classes_added, classes_removed = _compute_diff_count(results["classes"], prev_classes)
        imports_added, imports_removed = _compute_diff_count(results["imports"], prev_imports)

        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={
                "line_count": line_count,
                "file_size": file_size,
                "functions": results["functions"],
                "classes": results["classes"],
                "imports": results["imports"],
                "todos": results["todos"],
                "functions_added": funcs_added,
                "functions_removed": funcs_removed,
                "classes_added": classes_added,
                "classes_removed": classes_removed,
                "imports_added": imports_added,
                "imports_removed": imports_removed,
                "language": lang,
            },
        )
