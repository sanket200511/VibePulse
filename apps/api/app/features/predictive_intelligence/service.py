"""
Predictive Engineering Intelligence Service.

Orchestrates evidence-backed forecasting by querying canonical telemetry from PostgreSQL,
reusing Security Intelligence 2.0 and Project Context Memory, and passing data to
the deterministic signal provider.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.logging import get_logger
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.investigation.models import IncidentReviewHistory
from app.features.predictive_intelligence.providers import (
    DeterministicPredictiveProvider,
    PredictiveSignalProvider,
)
from app.features.predictive_intelligence.schemas import (
    HotspotItem,
    PredictiveSignal,
    PredictiveSummary,
    PredictiveTrendPoint,
)
from app.features.project_context.service import get_or_create_project_context
from app.features.projects.models import Project
from app.features.projects.service import normalize_root_path
from app.features.security_intelligence.service import (
    get_or_create_security_intelligence,
)
from app.features.sessions.models import Session
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)

# Default active provider
_DEFAULT_PROVIDER: PredictiveSignalProvider = DeterministicPredictiveProvider()


async def get_or_create_predictive_intelligence(
    db: AsyncSession,
    project_id: uuid.UUID,
    provider: PredictiveSignalProvider | None = None,
) -> PredictiveSummary:
    """
    Constructs an evidence-backed PredictiveSummary for a project.
    Derived 100% deterministically from PostgreSQL telemetry.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    norm_root = normalize_root_path(project.root_path)

    # 1. Fetch events for project
    stmt_events = (
        select(DevelopmentEvent)
        .where(
            or_(
                DevelopmentEvent.project_root == project.root_path,
                DevelopmentEvent.project_root == norm_root,
            )
        )
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    events_res = await db.execute(stmt_events)
    events = list(events_res.scalars().all())

    # 2. Fetch sessions for project
    stmt_sessions = (
        select(Session).where(Session.project_id == project_id).order_by(Session.started_at.asc())
    )
    sessions_res = await db.execute(stmt_sessions)
    sessions = list(sessions_res.scalars().all())

    # 3. Fetch event analyses
    event_ids = [e.id for e in events]
    analyses: list[EventAnalysis] = []
    if event_ids:
        stmt_analyses = select(EventAnalysis).where(EventAnalysis.event_id.in_(event_ids))
        analyses_res = await db.execute(stmt_analyses)
        analyses = list(analyses_res.scalars().all())

    # 4. Fetch Security Intelligence 2.0
    sec_intel = await get_or_create_security_intelligence(db, project_id)

    # 5. Fetch Project Context
    proj_context = await get_or_create_project_context(db, project_id)

    # 6. Fetch Incident Review History
    stmt_hist = (
        select(IncidentReviewHistory)
        .where(IncidentReviewHistory.project_id == project_id)
        .order_by(IncidentReviewHistory.created_at.asc())
    )
    hist_res = await db.execute(stmt_hist)
    review_history = list(hist_res.scalars().all())

    # 7. Generate predictions via provider
    active_provider = provider or _DEFAULT_PROVIDER
    (
        signals,
        hotspots,
        recurring_risks,
        drift,
        trends,
        status,
        status_msg,
    ) = await active_provider.generate_predictions(
        db=db,
        project=project,
        events=events,
        sessions=sessions,
        analyses=analyses,
        sec_intel=sec_intel,
        proj_context=proj_context,
        review_history=review_history,
    )

    crit_count = sum(1 for s in signals if s.severity == "CRITICAL")
    high_count = sum(1 for s in signals if s.severity == "HIGH")

    return PredictiveSummary(
        project_id=project_id,
        project_display_name=project.display_name,
        status=status,  # type: ignore[arg-type]
        status_message=status_msg,
        total_predictions=len(signals),
        critical_count=crit_count,
        high_count=high_count,
        active_hotspots_count=len(hotspots),
        recurring_risks_count=len(recurring_risks),
        engineering_drift=drift,
        forecast_signals=signals,
        hotspots=hotspots,
        recurring_risks=recurring_risks,
        trends=trends,
        generated_at=datetime.now(tz=UTC),
    )


async def get_hotspots(db: AsyncSession, project_id: uuid.UUID) -> list[HotspotItem]:
    """Retrieve ranked engineering hotspots for project."""
    summary = await get_or_create_predictive_intelligence(db, project_id)
    return summary.hotspots


async def get_predictive_trends(
    db: AsyncSession, project_id: uuid.UUID
) -> list[PredictiveTrendPoint]:
    """Retrieve historical trend time-series for project."""
    summary = await get_or_create_predictive_intelligence(db, project_id)
    return summary.trends


async def get_prediction_by_id(
    db: AsyncSession, project_id: uuid.UUID, prediction_id: str
) -> PredictiveSignal | None:
    """Retrieve a specific predictive signal with full evidence details."""
    summary = await get_or_create_predictive_intelligence(db, project_id)
    for s in summary.forecast_signals:
        if s.prediction_id == prediction_id:
            return s
    return None
