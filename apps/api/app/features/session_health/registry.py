"""
Health generator registry — the canonical list of all active generators.

To add a new generator: instantiate it here and append it to
``HEALTH_GENERATORS``. The engine sorts by priority automatically, so order
in this list does not matter for execution sequence.
"""

from __future__ import annotations

from app.features.session_health.domain import HealthGenerator
from app.features.session_health.generators import (
    CompletionHealthGenerator,
    FlowHealthGenerator,
    FocusHealthGenerator,
    MomentumHealthGenerator,
    StabilityHealthGenerator,
)

HEALTH_GENERATORS: list[HealthGenerator] = [
    FocusHealthGenerator(),  # priority 10
    MomentumHealthGenerator(),  # priority 20
    FlowHealthGenerator(),  # priority 30
    StabilityHealthGenerator(),  # priority 40
    CompletionHealthGenerator(),  # priority 50
]
