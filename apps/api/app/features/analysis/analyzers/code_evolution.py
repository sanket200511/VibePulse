"""
Code evolution analyzer — reconstructs the evolution story of the codebase.

Consumes static analysis findings from the current and previous event to emit
deterministic evolution observations.

Findings schema
---------------
{
    "observations": [
        {
            "kind": str,
            "symbol": str
        }
    ]
}
"""

from __future__ import annotations

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding


class CodeEvolutionAnalyzer:
    """
    Computes semantic evolution observations deterministically from AST deltas.

    Relies on `static_analysis` having run before it.
    """

    name = "code_evolution"
    version = 1
    description = "Computes deterministic evolution observations across time."
    priority = 60  # Must run after static_analysis (50)
    enabled = True

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        if event.event_type not in ("FILE_CREATED", "FILE_MODIFIED", "FILE_DELETED"):
            return None

        observations = []

        if event.event_type == "FILE_DELETED":
            observations.append(
                {"kind": "FILE_DELETED", "symbol": event.file_name or event.file_path or ""}
            )
            return AnalysisFinding(
                analyzer_name=self.name,
                analyzer_version=self.version,
                findings={"observations": observations},
            )

        current_static = context.current_findings.get("static_analysis", {})
        prev_static = context.previous_findings.get("static_analysis", {})

        if not current_static:
            # If static_analysis failed or opted out, we can't do evolution
            return None

        # Compare functions
        curr_funcs = set(current_static.get("functions", []))
        prev_funcs = set(prev_static.get("functions", []))
        for f in curr_funcs - prev_funcs:
            observations.append({"kind": "FUNCTION_ADDED", "symbol": f})
        for f in prev_funcs - curr_funcs:
            observations.append({"kind": "FUNCTION_REMOVED", "symbol": f})

        # Compare classes
        curr_classes = set(current_static.get("classes", []))
        prev_classes = set(prev_static.get("classes", []))
        for c in curr_classes - prev_classes:
            observations.append({"kind": "CLASS_ADDED", "symbol": c})
        for c in prev_classes - curr_classes:
            observations.append({"kind": "CLASS_REMOVED", "symbol": c})

        # Compare imports
        curr_imports = set(current_static.get("imports", []))
        prev_imports = set(prev_static.get("imports", []))
        for i in curr_imports - prev_imports:
            observations.append({"kind": "IMPORT_INTRODUCED", "symbol": i})
        for i in prev_imports - curr_imports:
            observations.append({"kind": "IMPORT_REMOVED", "symbol": i})

        # Compare TODOs
        curr_todos = set(current_static.get("todos", []))
        prev_todos = set(prev_static.get("todos", []))
        for t in curr_todos - prev_todos:
            observations.append({"kind": "TODO_INTRODUCED", "symbol": t})
        for t in prev_todos - curr_todos:
            observations.append({"kind": "TODO_RESOLVED", "symbol": t})

        # Compare sizes
        curr_lines = current_static.get("line_count", 0)
        prev_lines = prev_static.get("line_count", 0)

        # Only report if it's a significant change to avoid noise, e.g. > 10% or newly created
        if prev_lines == 0 and curr_lines > 0:
            observations.append(
                {"kind": "FILE_CREATED", "symbol": event.file_name or event.file_path or ""}
            )
        elif prev_lines > 0 and curr_lines > prev_lines + max(5, prev_lines * 0.1):
            observations.append(
                {"kind": "FILE_EXPANDED", "symbol": event.file_name or event.file_path or ""}
            )
        elif prev_lines > 0 and curr_lines < prev_lines - max(5, prev_lines * 0.1):
            observations.append(
                {"kind": "FILE_SHRANK", "symbol": event.file_name or event.file_path or ""}
            )

        if not observations:
            return None

        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={"observations": observations},
        )
