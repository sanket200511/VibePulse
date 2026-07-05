"""
Insight generator registry — the canonical list of all active generators.

To add a new generator: instantiate it here and append it to
``INSIGHT_GENERATORS``. The engine sorts by priority automatically, so order
in this list does not matter for execution sequence.
"""

from __future__ import annotations

from app.features.insights.domain import (
    ActivityInsightGenerator,
    ContextSwitchingInsightGenerator,
    DevelopmentPatternsInsightGenerator,
    DirectoriesInsightGenerator,
    FilesInsightGenerator,
    IdleBehaviourInsightGenerator,
    InsightGenerator,
    LanguagesInsightGenerator,
    SessionStatisticsInsightGenerator,
)

INSIGHT_GENERATORS: list[InsightGenerator] = [
    ActivityInsightGenerator(),  # priority 10
    FilesInsightGenerator(),  # priority 20
    DirectoriesInsightGenerator(),  # priority 30
    LanguagesInsightGenerator(),  # priority 40
    DevelopmentPatternsInsightGenerator(),  # priority 50
    SessionStatisticsInsightGenerator(),  # priority 60
    ContextSwitchingInsightGenerator(),  # priority 70
    IdleBehaviourInsightGenerator(),  # priority 80
]
