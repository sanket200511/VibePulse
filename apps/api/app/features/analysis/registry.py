"""
Analyzer registry — the canonical list of all active analyzers.

To add a new analyzer: instantiate it here and append it to ``ANALYZERS``.
The pipeline sorts by priority automatically, so order in this list does not
matter for execution sequence.
"""

from __future__ import annotations

from app.features.analysis.analyzers.activity_rate import ActivityRateAnalyzer
from app.features.analysis.analyzers.code_evolution import CodeEvolutionAnalyzer
from app.features.analysis.analyzers.file_metadata import FileMetadataAnalyzer
from app.features.analysis.analyzers.git_context import GitContextAnalyzer
from app.features.analysis.analyzers.language import LanguageAnalyzer
from app.features.analysis.analyzers.security import SecurityAnalyzer
from app.features.analysis.analyzers.static_analysis import StaticAnalysisAnalyzer
from app.features.analysis.base import Analyzer

ANALYZERS: list[Analyzer] = [
    LanguageAnalyzer(),  # priority 10
    FileMetadataAnalyzer(),  # priority 20
    GitContextAnalyzer(),  # priority 30
    ActivityRateAnalyzer(),  # priority 40
    StaticAnalysisAnalyzer(),  # priority 50
    SecurityAnalyzer(),  # priority 55
    CodeEvolutionAnalyzer(),  # priority 60
]
