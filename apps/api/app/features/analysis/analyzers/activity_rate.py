"""
Activity rate analyzer — summarises recent edit velocity for the session.

Uses the pre-fetched ``SessionActivityContext`` from ``AnalysisContext`` so
no additional DB queries are needed.

Findings schema
---------------
{
    "events_last_5min": int,    # total events in the past 5 minutes
    "events_last_hour": int,    # total events in the past hour
    "events_per_minute": float, # average rate over the past 5 minutes
    "is_burst": bool,           # True when events_per_minute > 10
}
"""

from __future__ import annotations

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding

# Threshold above which activity is classified as a "burst".
_BURST_THRESHOLD_PER_MINUTE: float = 10.0

# Window used to compute events_per_minute.
_WINDOW_MINUTES: float = 5.0


class ActivityRateAnalyzer:
    """
    Compute the recent edit velocity for the session.

    Findings
    --------
    events_last_5min  : int   - event count in the last 5 minutes
    events_last_hour  : int   - event count in the last hour
    events_per_minute : float - average rate over the 5-minute window
    is_burst          : bool  - True when rate exceeds 10 events/minute
    """

    name = "activity_rate"
    version = 1
    description = "Measures recent file-change velocity for the session."
    priority = 40
    enabled = True

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        activity = context.session_activity
        events_per_minute = round(activity.events_last_5min / _WINDOW_MINUTES, 2)
        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={
                "events_last_5min": activity.events_last_5min,
                "events_last_hour": activity.events_last_hour,
                "events_per_minute": events_per_minute,
                "is_burst": events_per_minute > _BURST_THRESHOLD_PER_MINUTE,
            },
        )
