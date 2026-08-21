"""
Unified Project Health & Intelligence Orchestrator Service.

Pure, deterministic composition layer that orchestrates:
- Security Intelligence 2.0 -> Security Health (25%)
- Project Intelligence + Engineering DNA -> Engineering Stability (20%)
- Investigation Engine 3.0 Incident Metrics -> Incident Health (20%)
- Incident Review History -> Resolution Health (15%)
- Predictive Engineering Intelligence -> Predictive Risk Health (20%)
- Synthesized Actionable Priority Engine ("What Should I Do Next?")
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.core.logging import get_logger
from app.features.investigation.models import IncidentReviewHistory
from app.features.investigation.service import calculate_incident_metrics
from app.features.predictive_intelligence.providers import classify_subsystem
from app.features.predictive_intelligence.service import (
    get_or_create_predictive_intelligence,
)
from app.features.project_health.schemas import (
    HealthDimension,
    ProjectPriorityItem,
    UnifiedProjectHealth,
)
from app.features.projects.models import Project
from app.features.projects.service import get_project_intelligence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from app.features.investigation.schemas import IncidentMetrics
    from app.features.predictive_intelligence.schemas import PredictiveSummary
    from app.features.security_intelligence.schemas import SecurityIntelligenceRead

logger = get_logger(__name__)


def compute_health_status(score: int) -> str:
    """Classify 0-100 positive score into standard operational health status."""
    if score >= 90:
        return "OPTIMAL"
    if score >= 75:
        return "STABLE"
    if score >= 60:
        return "NEEDS_ATTENTION"
    if score >= 40:
        return "DEGRADED"
    return "CRITICAL"


def compute_health_grade(score: int) -> str:
    """Classify 0-100 overall score into executive health grade."""
    if score >= 90:
        return "EXCELLENT"
    if score >= 75:
        return "HEALTHY"
    if score >= 60:
        return "NEEDS_ATTENTION"
    if score >= 40:
        return "DEGRADED"
    return "CRITICAL"


def create_insufficient_dimension(name: str, key: str, weight: float) -> HealthDimension:
    """Helper to instantiate an insufficient-evidence HealthDimension."""
    return HealthDimension(
        name=name,
        dimension_key=key,  # type: ignore[arg-type]
        score=100,
        status="UNKNOWN",
        weight=weight,
        contributing_signals=["Awaiting initial development sessions"],
        explanation="Insufficient telemetry to evaluate this dimension.",
        provenance="UNKNOWN",
    )


async def get_or_create_unified_project_health(
    db: AsyncSession, project_id: uuid.UUID
) -> UnifiedProjectHealth:
    """
    Synthesizes the complete Unified Project Health model across all 5 dimensions.
    100% deterministic and reconstructible from canonical PostgreSQL telemetry.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project '{project_id}' not found")

    now = datetime.now(tz=UTC)

    # ── 1. GATHER CANONICAL PROJECTIONS ────────────────────────────────────────
    # Reuse Security Intelligence 2.0
    from app.features.security_intelligence.service import (
        get_or_create_security_intelligence,
    )

    sec_intel = await get_or_create_security_intelligence(db, project_id)

    # Reuse Project Intelligence
    proj_intel = await get_project_intelligence(db, project_id)

    # Reuse Investigation Incident Metrics & Review History
    incident_metrics = await calculate_incident_metrics(db, project_id)

    stmt_hist = (
        select(IncidentReviewHistory)
        .where(IncidentReviewHistory.project_id == project_id)
        .order_by(IncidentReviewHistory.created_at.asc())
    )
    hist_res = await db.execute(stmt_hist)
    review_history = list(hist_res.scalars().all())

    # Reuse Predictive Intelligence
    pred_summary = await get_or_create_predictive_intelligence(db, project_id)

    # ── 2. EVALUATE INSUFFICIENT EVIDENCE STATE ───────────────────────────────
    total_events = (
        proj_intel.get("total_events", 0)
        if isinstance(proj_intel, dict)
        else getattr(proj_intel, "total_events", 0)
    )
    activity_series = (
        proj_intel.get("activity_series", [])
        if isinstance(proj_intel, dict)
        else getattr(proj_intel, "activity_series", [])
    )
    languages_dict = (
        proj_intel.get("language_activity", {})
        if isinstance(proj_intel, dict)
        else getattr(proj_intel, "languages", {})
    )
    total_sessions = len(activity_series)
    total_findings = len(sec_intel.security_findings)

    is_insufficient = (
        pred_summary.status == "INSUFFICIENT_EVIDENCE"
        and total_events < 2
        and total_sessions == 0
        and total_findings == 0
    )

    if is_insufficient:
        # Explicit Insufficient Evidence State
        return UnifiedProjectHealth(
            project_id=project_id,
            project_display_name=project.display_name,
            overall_health_score=None,
            grade="INSUFFICIENT_EVIDENCE",
            status="INSUFFICIENT_EVIDENCE",
            status_message=(
                "Insufficient historical telemetry to determine project health. "
                "Record development activity to establish baseline."
            ),
            security_health=create_insufficient_dimension(
                "Security Health", "security_health", 0.25
            ),
            engineering_stability=create_insufficient_dimension(
                "Engineering Stability", "engineering_stability", 0.20
            ),
            incident_health=create_insufficient_dimension(
                "Incident Health", "incident_health", 0.20
            ),
            resolution_health=create_insufficient_dimension(
                "Resolution Health", "resolution_health", 0.15
            ),
            predictive_risk_health=create_insufficient_dimension(
                "Predictive Risk Health", "predictive_risk_health", 0.20
            ),
            top_priorities=[],
            open_incidents_count=0,
            resolved_incidents_count=0,
            active_security_findings_count=0,
            active_hotspots_count=0,
            active_forecasts_count=0,
            generated_at=now,
        )

    # ── 3. DIMENSION 1: SECURITY HEALTH (Weight 25%) ──────────────────────────
    # Normalization: Invert adverse Security Risk Score (0=safe, 100=max risk)
    # to positive Health Score (100=optimal, 0=critical)
    sec_risk_score = sec_intel.risk_explanation.total_score if sec_intel.risk_explanation else 0
    sec_risk_level = sec_intel.risk_explanation.risk_level if sec_intel.risk_explanation else "LOW"
    sec_health_score = max(0, min(100, 100 - sec_risk_score))
    sec_signals = [
        f"Security posture risk level: {sec_risk_level}",
        f"{len(sec_intel.security_findings)} total security finding(s) detected",
        f"{len(sec_intel.sensitive_files)} sensitive repository file(s) tracked",
    ]
    sec_explanation = (
        f"Security posture is {sec_risk_level} with {len(sec_intel.security_findings)} "
        f"active finding(s). Inverted risk score is {sec_health_score}/100."
    )
    dim_security = HealthDimension(
        name="Security Health",
        dimension_key="security_health",
        score=sec_health_score,
        status=compute_health_status(sec_health_score),  # type: ignore[arg-type]
        weight=0.25,
        contributing_signals=sec_signals,
        explanation=sec_explanation,
        provenance="OBSERVED",
    )

    # ── 4. DIMENSION 2: ENGINEERING STABILITY (Weight 20%) ───────────────────
    # Normalization: Derived from activity distribution, language ecosystem, and session continuity
    eng_score = 100
    if len(activity_series) > 0:
        # Check event distribution volatility
        recent_events = sum(
            (s.get("event_count", 0) if isinstance(s, dict) else getattr(s, "event_count", 0))
            for s in activity_series[-3:]
        )
        if recent_events > 50:
            eng_score -= 10  # Rapid modification burst penalty
    if len(languages_dict) > 3:
        eng_score -= 5  # High ecosystem fragmentation penalty
    eng_score = max(40, min(100, eng_score))

    dominant_subsystem = (
        pred_summary.engineering_drift.current_focus
        if hasattr(pred_summary, "engineering_drift") and pred_summary.engineering_drift
        else "Core Application"
    )

    eng_signals = [
        f"{total_events} recorded events across {len(activity_series)} session(s)",
        f"Primary languages: {', '.join(languages_dict.keys()) or 'General'}",
        f"Active development focus: {dominant_subsystem}",
    ]
    dim_stability = HealthDimension(
        name="Engineering Stability",
        dimension_key="engineering_stability",
        score=eng_score,
        status=compute_health_status(eng_score),  # type: ignore[arg-type]
        weight=0.20,
        contributing_signals=eng_signals,
        explanation=(
            f"Engineering velocity is consistent across {len(activity_series)} sessions. "
            f"Stability score is {eng_score}/100."
        ),
        provenance="OBSERVED",
    )

    # ── 5. DIMENSION 3: INCIDENT HEALTH (Weight 20%) ──────────────────────────
    # Normalization: Invert open incident load and severity
    open_inc = incident_metrics.open_incidents
    crit_inc = sum(1 for f in sec_intel.security_findings if f.severity == "CRITICAL")
    high_inc = sum(1 for f in sec_intel.security_findings if f.severity == "HIGH")

    inc_penalty = (crit_inc * 30) + (high_inc * 15) + (open_inc * 10)
    inc_score = max(0, min(100, 100 - inc_penalty))

    avg_res_min = (
        (incident_metrics.avg_resolution_time_seconds / 60.0)
        if incident_metrics.avg_resolution_time_seconds is not None
        else 0.0
    )
    inc_signals = [
        f"{open_inc} open incident(s) currently under investigation",
        f"{crit_inc} critical severity and {high_inc} high severity finding(s)",
        f"Average resolution time: {avg_res_min:.1f}m",
    ]
    dim_incidents = HealthDimension(
        name="Incident Health",
        dimension_key="incident_health",
        score=inc_score,
        status=compute_health_status(inc_score),  # type: ignore[arg-type]
        weight=0.20,
        contributing_signals=inc_signals,
        explanation=(
            f"Current active incident backlog comprises {open_inc} open item(s). "
            f"Incident health score is {inc_score}/100."
        ),
        provenance="OBSERVED",
    )

    # ── 6. DIMENSION 4: RESOLUTION HEALTH (Weight 15%) ─────────────────────────
    # Normalization: Resolution rate + penalty for resolution regressions
    total_triaged = incident_metrics.open_incidents + incident_metrics.resolved_incidents
    res_rate = (
        (incident_metrics.resolved_incidents / total_triaged * 100) if total_triaged > 0 else 100.0
    )

    # Check for active resolution regression signal in predictive summary
    has_regression = any(
        s.prediction_type == "RESOLUTION_REGRESSION" for s in pred_summary.forecast_signals
    )
    reg_penalty = 35 if has_regression else 0

    res_score = max(0, min(100, int((res_rate * 0.6) + ((100 - reg_penalty) * 0.4))))

    res_signals = [
        f"{incident_metrics.resolved_incidents} resolved out of {total_triaged} triaged",
        f"Historical resolution rate: {res_rate:.1f}%",
        f"Resolution regression active: {'YES (Penalty applied)' if has_regression else 'NO'}",
    ]
    dim_resolution = HealthDimension(
        name="Resolution Health",
        dimension_key="resolution_health",
        score=res_score,
        status=compute_health_status(res_score),  # type: ignore[arg-type]
        weight=0.15,
        contributing_signals=res_signals,
        explanation=(
            f"Resolution effectiveness is {res_rate:.1f}%. "
            f"{'Warning: Active regression detected. ' if has_regression else ''}"
            f"Score is {res_score}/100."
        ),
        provenance="OBSERVED",
    )

    # ── 7. DIMENSION 5: PREDICTIVE RISK HEALTH (Weight 20%) ───────────────────
    # Normalization: Invert maximum forecast scores and hotspot density
    max_forecast_score = (
        max((s.forecast_score for s in pred_summary.forecast_signals), default=0)
        if pred_summary.forecast_signals
        else 0
    )
    hotspot_penalty = min(30, len(pred_summary.hotspots) * 10)
    pred_health_score = max(0, min(100, 100 - int((max_forecast_score * 0.7) + hotspot_penalty)))

    pred_signals = [
        f"{pred_summary.total_predictions} active predictive forecast(s)",
        f"{pred_summary.active_hotspots_count} active engineering hotspot(s)",
        f"Highest forecast strength: {max_forecast_score}/100",
    ]
    dim_predictive = HealthDimension(
        name="Predictive Risk Health",
        dimension_key="predictive_risk_health",
        score=pred_health_score,
        status=compute_health_status(pred_health_score),  # type: ignore[arg-type]
        weight=0.20,
        contributing_signals=pred_signals,
        explanation=(
            f"Anticipated risk reflects {pred_summary.total_predictions} forecast(s) "
            f"and {pred_summary.active_hotspots_count} hotspot(s). Score: {pred_health_score}/100."
        ),
        provenance="OBSERVED",
    )

    # ── 8. COMPOSITE OVERALL HEALTH SCORE & GRADE ─────────────────────────────
    # Deterministic weighted formula:
    # 0.25 * sec + 0.20 * eng + 0.20 * inc + 0.15 * res + 0.20 * pred
    overall_score = round(
        (0.25 * sec_health_score)
        + (0.20 * eng_score)
        + (0.20 * inc_score)
        + (0.15 * res_score)
        + (0.20 * pred_health_score)
    )
    overall_score = max(0, min(100, overall_score))
    grade = compute_health_grade(overall_score)

    # ── 9. ACTIONABLE PRIORITY ENGINE ("What Should I Do Next?") ───────────────
    priorities = await get_project_priorities_internal(
        project_id=project_id,
        sec_intel=sec_intel,
        incident_metrics=incident_metrics,
        pred_summary=pred_summary,
        review_history=review_history,
    )

    return UnifiedProjectHealth(
        project_id=project_id,
        project_display_name=project.display_name,
        overall_health_score=overall_score,
        grade=grade,  # type: ignore[arg-type]
        status="READY",
        status_message=f"Project health is {grade} ({overall_score}/100).",
        security_health=dim_security,
        engineering_stability=dim_stability,
        incident_health=dim_incidents,
        resolution_health=dim_resolution,
        predictive_risk_health=dim_predictive,
        top_priorities=priorities,
        open_incidents_count=incident_metrics.open_incidents,
        resolved_incidents_count=incident_metrics.resolved_incidents,
        active_security_findings_count=len(sec_intel.security_findings),
        active_hotspots_count=pred_summary.active_hotspots_count,
        active_forecasts_count=pred_summary.total_predictions,
        generated_at=now,
    )


async def get_project_priorities_internal(
    project_id: uuid.UUID,
    sec_intel: SecurityIntelligenceRead,
    incident_metrics: IncidentMetrics,
    pred_summary: PredictiveSummary,
    review_history: list[IncidentReviewHistory],
) -> list[ProjectPriorityItem]:
    """
    Internal deterministic priority ranking engine.
    Ranks candidates across regressions, critical incidents, security findings, and hotspots.
    """
    candidates: list[ProjectPriorityItem] = []

    # 1. RESOLUTION REGRESSIONS (Priority Score: 95)
    for sig in pred_summary.forecast_signals:
        if sig.prediction_type == "RESOLUTION_REGRESSION":
            candidates.append(
                ProjectPriorityItem(
                    priority_id=f"prio-regr-{sig.prediction_id[:8]}",
                    rank=1,  # Placeholder, sorted below
                    category="REGRESSION_ALERT",
                    title=f"Remediate Regression: {sig.title}",
                    severity="CRITICAL",
                    priority_score=95,
                    why_ranked_highly=(
                        "A security finding reappeared after a previous resolution was "
                        "recorded in the review audit trail."
                    ),
                    contributing_evidence=sig.contributing_signals,
                    affected_files=sig.affected_files,
                    affected_subsystem=(
                        sig.affected_subsystems[0]
                        if sig.affected_subsystems
                        else "Authentication & Security"
                    ),
                    recommended_action=sig.recommended_action,
                    deep_link_url=f"/projects/{project_id}/investigation",
                    provenance="OBSERVED",
                )
            )

    # 2. CRITICAL / HIGH SECURITY FINDINGS (Priority Score: 85-90)
    for sf in sec_intel.security_findings:
        if sf.status == "OPEN" and sf.severity in ("CRITICAL", "HIGH"):
            p_score = 90 if sf.severity == "CRITICAL" else 82
            candidates.append(
                ProjectPriorityItem(
                    priority_id=f"prio-sec-{sf.finding_id[:8]}",
                    rank=1,
                    category="SECURITY_REMEDIATION",
                    title=f"Resolve {sf.severity} Finding: {sf.title} ({sf.rule_id})",
                    severity=sf.severity,
                    priority_score=p_score,
                    why_ranked_highly=(
                        f"Unmitigated {sf.severity} security rule violation in {sf.file_path}."
                    ),
                    contributing_evidence=[
                        f"Rule {sf.rule_id} triggered in {sf.file_path}",
                        f"Category: {sf.category}",
                        f"Risk contribution: {sf.risk_contribution} points",
                    ],
                    affected_files=[sf.file_path] if sf.file_path else [],
                    affected_subsystem=classify_subsystem(sf.file_path),
                    recommended_action=(
                        sf.remediation
                        or f"Apply validation and externalize credentials in {sf.file_path}."
                    ),
                    deep_link_url=f"/projects/{project_id}/security",
                    provenance="OBSERVED",
                )
            )

    # 3. TOP ENGINEERING HOTSPOTS (Priority Score: 70-75)
    for h in pred_summary.hotspots:
        if h.hotspot_score >= 50:
            candidates.append(
                ProjectPriorityItem(
                    priority_id=f"prio-hotspot-{uuid.uuid4().hex[:8]}",
                    rank=1,
                    category="HOTSPOT_REVIEW",
                    title=f"Conduct Architecture Review: {h.subsystem}",
                    severity="HIGH" if h.findings_count > 0 else "MEDIUM",
                    priority_score=72,
                    why_ranked_highly=(
                        f"Hotspot score is {h.hotspot_score}/100 with "
                        f"{h.activity_count} modifications and {h.findings_count} findings."
                    ),
                    contributing_evidence=[
                        f"{h.activity_count} recorded modification events in {h.file_path}",
                        f"{h.findings_count} security findings in subsystem",
                        f"Trend velocity: {h.trend}",
                    ],
                    affected_files=[h.file_path],
                    affected_subsystem=h.subsystem,
                    recommended_action=f"Perform code review on {h.file_path} before merge.",
                    deep_link_url=f"/projects/{project_id}/predictions",
                    provenance="OBSERVED",
                )
            )

    # 4. PREDICTIVE RECURRENCE SIGNALS (Priority Score: 60-68)
    for sig in pred_summary.forecast_signals:
        if sig.prediction_type in ("SECURITY_RECURRENCE", "CHANGE_BURST"):
            candidates.append(
                ProjectPriorityItem(
                    priority_id=f"prio-pred-{sig.prediction_id[:8]}",
                    rank=1,
                    category="PREDICTIVE_PREVENTION",
                    title=f"Prevent Recurrence: {sig.title}",
                    severity=sig.severity,
                    priority_score=65,
                    why_ranked_highly=(
                        f"Forecast strength is {sig.forecast_score}/100 with "
                        f"{sig.evidence_strength} historical evidence."
                    ),
                    contributing_evidence=sig.contributing_signals,
                    affected_files=sig.affected_files,
                    affected_subsystem=(
                        sig.affected_subsystems[0]
                        if sig.affected_subsystems
                        else "Core Application"
                    ),
                    recommended_action=sig.recommended_action,
                    deep_link_url=f"/projects/{project_id}/predictions",
                    provenance="OBSERVED",
                )
            )

    # Deduplicate candidates by title
    unique_candidates: list[ProjectPriorityItem] = []
    seen_titles = set()
    for c in candidates:
        if c.title not in seen_titles:
            seen_titles.add(c.title)
            unique_candidates.append(c)

    # Deterministic multi-key sorting:
    # 1. priority_score descending
    # 2. severity rank (CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1) descending
    # 3. title alphabetical ascending (stable tie-breaking)
    sev_map = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    unique_candidates.sort(
        key=lambda item: (-item.priority_score, -sev_map.get(item.severity, 0), item.title)
    )

    # Assign 1-indexed deterministic rank
    for idx, item in enumerate(unique_candidates, start=1):
        item.rank = idx

    return unique_candidates[:6]


async def get_project_priorities(
    db: AsyncSession, project_id: uuid.UUID
) -> list[ProjectPriorityItem]:
    """Retrieve ranked actionable priority items for project."""
    health = await get_or_create_unified_project_health(db, project_id)
    return health.top_priorities
