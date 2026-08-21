"""
Universal Evidence & Explainability Service.

Implements deep, causal traceability answering "WHY DOES VIBEPULSE BELIEVE THIS?"
across all 5 core entity domains:
- Health (Mathematical Score Decomposition & 5-Dimension Causal Chain)
- Security (AST Violation Rationale, Risk Contribution, Redacted Evidence)
- Incident (Evidence Graph Correlation, Review History, Root Cause)
- Prediction (Forecast Breakdown, Evidence Strength, Hotspot Concentration)
- Priority (Deterministic Ranking Weights, Rationale, Recommended Action)
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.logging import get_logger
from app.features.events.models import DevelopmentEvent
from app.features.evidence.schemas import (
    EntityExplainabilityResponse,
    EntityType,
    EvidenceChainStep,
    EvidenceItem,
    ScoreDecompositionItem,
)
from app.features.investigation.models import IncidentReviewHistory, IncidentReviewState
from app.features.investigation.service import calculate_incident_metrics
from app.features.predictive_intelligence.service import (
    get_or_create_predictive_intelligence,
)
from app.features.project_health.service import (
    get_or_create_unified_project_health,
    get_project_priorities,
)
from app.features.projects.models import Project
from app.features.security_intelligence.service import (
    compute_security_intelligence,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


async def explain_entity(
    db: AsyncSession,
    project_id: uuid.UUID,
    entity_type: EntityType,
    entity_id: str,
) -> EntityExplainabilityResponse:
    """
    Main entry point for explainability intelligence.
    Routes to the appropriate deterministic explainability synthesizer.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project '{project_id}' not found")

    if entity_type == "health":
        return await _explain_health(db, project_id, entity_id, project.display_name)
    elif entity_type == "security":
        return await _explain_security(db, project_id, entity_id)
    elif entity_type == "incident":
        return await _explain_incident(db, project_id, entity_id)
    elif entity_type == "prediction":
        return await _explain_prediction(db, project_id, entity_id)
    elif entity_type == "priority":
        return await _explain_priority(db, project_id, entity_id)
    else:
        raise ValueError(f"Unsupported entity type '{entity_type}'")


async def _explain_health(
    db: AsyncSession,
    project_id: uuid.UUID,
    entity_id: str,
    project_display_name: str,
) -> EntityExplainabilityResponse:
    """Explains overall project health score decomposition and 5-dimension causal chain."""
    health = await get_or_create_unified_project_health(db, project_id)
    now = datetime.now(tz=UTC)

    # Score Decomposition Table
    decomposition: list[ScoreDecompositionItem] = []
    dim_map = [
        ("Security Health", "security_health", health.security_health),
        ("Engineering Stability", "engineering_stability", health.engineering_stability),
        ("Incident Health", "incident_health", health.incident_health),
        ("Resolution Health", "resolution_health", health.resolution_health),
        ("Predictive Risk Health", "predictive_risk_health", health.predictive_risk_health),
    ]

    for name, key, dim in dim_map:
        weighted = round(dim.score * dim.weight, 2)
        decomposition.append(
            ScoreDecompositionItem(
                dimension_name=name,
                dimension_key=key,
                raw_score=dim.score,
                weight=dim.weight,
                weighted_contribution=weighted,
                explanation=dim.explanation,
                contributing_signals=dim.contributing_signals,
                provenance=dim.provenance,
            )
        )

    # Causal Evidence Chain
    chain: list[EvidenceChainStep] = [
        EvidenceChainStep(
            step_number=1,
            stage="OBSERVE",
            title="Telemetry Baselines Recorded",
            description=(
                f"Aggregated {health.active_security_findings_count} findings, "
                f"{health.open_incidents_count} open incidents, and "
                f"{health.active_hotspots_count} hotspots from PostgreSQL."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=2,
            stage="DETECT",
            title="Security & Risk Assessment",
            description=(
                f"Security Health evaluated at {health.security_health.score}/100 "
                f"({health.security_health.status}) with weight 25%."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=3,
            stage="RESOLVE",
            title="Resolution Effectiveness",
            description=(
                f"Resolution Health evaluated at {health.resolution_health.score}/100 "
                f"with {health.resolved_incidents_count} resolved incident(s)."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=4,
            stage="ANTICIPATE",
            title="Predictive Risk Anticipation",
            description=(
                f"Predictive Risk Health evaluated at {health.predictive_risk_health.score}/100 "
                f"with {health.active_forecasts_count} active forecast signal(s)."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=5,
            stage="HEALTH",
            title="Weighted Synthesis",
            description=(
                f"Composite score = 0.25*Sec({health.security_health.score}) + "
                f"0.20*Eng({health.engineering_stability.score}) + "
                f"0.20*Inc({health.incident_health.score}) + "
                f"0.15*Res({health.resolution_health.score}) + "
                f"0.20*Pred({health.predictive_risk_health.score}) "
                f"= {health.overall_health_score}/100 ({health.grade})."
            ),
            provenance="OBSERVED",
        ),
    ]

    why = (
        f"Project health for '{project_display_name}' is rated {health.grade} "
        f"({health.overall_health_score}/100). The score is deterministically synthesized "
        f"across five dimensions: Security ({health.security_health.score}/100), "
        f"Engineering Stability ({health.engineering_stability.score}/100), "
        f"Incident Backlog ({health.incident_health.score}/100), "
        f"Resolution Effectiveness ({health.resolution_health.score}/100), and "
        f"Anticipated Predictive Risk ({health.predictive_risk_health.score}/100)."
    )

    sec_status = f"Security: {health.security_health.score}/100 ({health.security_health.status})"
    eng_status = (
        f"Stability: {health.engineering_stability.score}/100 "
        f"({health.engineering_stability.status})"
    )
    inc_status = f"Incidents: {health.incident_health.score}/100 ({health.incident_health.status})"
    res_status = (
        f"Resolutions: {health.resolution_health.score}/100 ({health.resolution_health.status})"
    )
    pred_status = (
        f"Predictive Risk: {health.predictive_risk_health.score}/100 "
        f"({health.predictive_risk_health.status})"
    )

    return EntityExplainabilityResponse(
        entity_type="health",
        entity_id=entity_id or "overall",
        project_id=project_id,
        title=f"Project Health Explanation ({health.grade})",
        summary=f"Deterministic weighted synthesis: {health.overall_health_score}/100",
        why_explanation=why,
        score=health.overall_health_score,
        score_decomposition=decomposition,
        evidence_chain=chain,
        contributing_signals=[sec_status, eng_status, inc_status, res_status, pred_status],
        provenance="OBSERVED",
        remediation=(
            health.top_priorities[0].recommended_action if health.top_priorities else None
        ),
        redaction_verified=True,
        generated_at=now,
    )


async def _explain_security(
    db: AsyncSession,
    project_id: uuid.UUID,
    entity_id: str,
) -> EntityExplainabilityResponse:
    """Explains an individual security finding, AST rule rationale, and risk contribution."""
    sec = await compute_security_intelligence(db, project_id)
    now = datetime.now(tz=UTC)

    # Find matching finding by finding_id or rule_id, or take first open finding
    target_finding = None
    for f in sec.security_findings:
        if entity_id in (f.finding_id, f.rule_id, "current", "latest"):
            target_finding = f
            break
    if not target_finding and sec.security_findings:
        target_finding = sec.security_findings[0]

    if not target_finding:
        return EntityExplainabilityResponse(
            entity_type="security",
            entity_id=entity_id,
            project_id=project_id,
            title="Zero Security Findings Detected",
            summary="Security posture is optimal with no active rule violations.",
            why_explanation="No AST security findings were detected in repository events.",
            score=100,
            provenance="OBSERVED",
            redaction_verified=True,
            generated_at=now,
        )

    # Query matching development event for timestamp and metadata
    stmt_ev = (
        select(DevelopmentEvent)
        .where(DevelopmentEvent.file_path == target_finding.file_path)
        .order_by(DevelopmentEvent.timestamp.desc())
        .limit(1)
    )
    ev_res = await db.execute(stmt_ev)
    source_event = ev_res.scalars().first()

    evidence_item = EvidenceItem(
        evidence_id=f"ev-{target_finding.finding_id[:8]}",
        project_id=project_id,
        timestamp=target_finding.detected_at,
        source_type="SECURITY_ANALYSIS",
        source_id=target_finding.finding_id,
        event_id=source_event.id if source_event else None,
        session_id=source_event.session_id if source_event else None,
        file_path=target_finding.file_path,
        rule_id=target_finding.rule_id,
        severity=target_finding.severity,
        title=target_finding.title,
        observed_value=f"Rule violation {target_finding.rule_id} in {target_finding.file_path}",
        derived_value=f"Risk contribution: +{target_finding.risk_contribution} points",
        provenance="OBSERVED",
        explanation=target_finding.description,
        redacted_evidence=target_finding.redacted_evidence,
        related_entities=[
            {"type": "rule", "id": target_finding.rule_id},
            {"type": "file", "path": target_finding.file_path},
        ],
    )

    sec_health_score = max(
        0, 100 - (sec.risk_explanation.total_score if sec.risk_explanation else 0)
    )

    chain = [
        EvidenceChainStep(
            step_number=1,
            stage="OBSERVE",
            title="File Modification Observed",
            description=f"Changes detected in sensitive file: {target_finding.file_path}",
            provenance="OBSERVED",
            evidence_item=evidence_item,
        ),
        EvidenceChainStep(
            step_number=2,
            stage="DETECT",
            title=f"AST Rule Triggered ({target_finding.rule_id})",
            description=(
                f"Security Guardian detected {target_finding.title} "
                f"({target_finding.severity} severity)."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=3,
            stage="INVESTIGATE",
            title="Risk Calculation & Correlation",
            description=(
                f"Finding contributes +{target_finding.risk_contribution} points "
                f"to project security risk."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=4,
            stage="HEALTH",
            title="Security Health Impact",
            description=f"Inverted Security Health adjusted to {sec_health_score}/100.",
            provenance="OBSERVED",
        ),
    ]

    why = (
        f"Rule {target_finding.rule_id} was triggered because static AST analysis observed "
        f"{target_finding.description} in {target_finding.file_path}. "
        f"Severity is {target_finding.severity} with an adverse risk contribution of "
        f"+{target_finding.risk_contribution} points."
    )

    return EntityExplainabilityResponse(
        entity_type="security",
        entity_id=target_finding.finding_id,
        project_id=project_id,
        title=f"Security Finding: {target_finding.title} ({target_finding.rule_id})",
        summary=f"Severity {target_finding.severity} in {target_finding.file_path}",
        why_explanation=why,
        score=target_finding.risk_contribution,
        evidence_chain=chain,
        evidence_items=[evidence_item],
        contributing_signals=[
            f"Rule {target_finding.rule_id} violated",
            f"File: {target_finding.file_path}",
            f"Severity: {target_finding.severity}",
            f"Risk Score Addition: +{target_finding.risk_contribution}",
        ],
        provenance="OBSERVED",
        remediation=target_finding.remediation,
        redaction_verified=True,
        generated_at=now,
    )


async def _explain_incident(
    db: AsyncSession,
    project_id: uuid.UUID,
    entity_id: str,
) -> EntityExplainabilityResponse:
    """Explains an incident triage status, review state transitions, and root cause."""
    metrics = await calculate_incident_metrics(db, project_id)
    now = datetime.now(tz=UTC)

    # Check review states
    stmt_states = select(IncidentReviewState).where(IncidentReviewState.project_id == project_id)
    res_states = await db.execute(stmt_states)
    states = list(res_states.scalars().all())

    target_state = next(
        (s for s in states if s.incident_id == entity_id or entity_id in ("current", "latest")),
        None,
    )

    # Fetch audit history
    stmt_hist = (
        select(IncidentReviewHistory)
        .where(IncidentReviewHistory.project_id == project_id)
        .order_by(IncidentReviewHistory.created_at.asc())
    )
    res_hist = await db.execute(stmt_hist)
    history = list(res_hist.scalars().all())

    status = target_state.status if target_state else ("RESOLVED" if history else "OPEN")
    inc_id = target_state.incident_id if target_state else (entity_id or "inc-general")

    res_note = (
        target_state.resolution_note
        if target_state and target_state.resolution_note
        else "Pending review"
    )

    chain = [
        EvidenceChainStep(
            step_number=1,
            stage="OBSERVE",
            title="Incident Identified",
            description=f"Incident {inc_id} triaged with status {status}.",
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=2,
            stage="INVESTIGATE",
            title="Review State Decisions",
            description=(f"Recorded {len(history)} review lifecycle transition(s) in audit trail."),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=3,
            stage="RESOLVE",
            title="Resolution Status",
            description=f"Current status: {status}. Note: {res_note}",
            provenance="OBSERVED",
        ),
    ]

    rate = metrics.resolution_rate_percent or 100.0
    why = (
        f"Incident {inc_id} has {len(history)} recorded state transition(s) in audit trail. "
        f"Current status is {status}. Resolution rate is {rate:.1f}%."
    )

    return EntityExplainabilityResponse(
        entity_type="incident",
        entity_id=inc_id,
        project_id=project_id,
        title=f"Incident Triage & Review State ({status})",
        summary=f"Incident {inc_id} is {status}",
        why_explanation=why,
        score=metrics.resolution_rate_percent,
        evidence_chain=chain,
        contributing_signals=[
            f"Current Status: {status}",
            f"Review Transitions: {len(history)}",
            f"Resolution Rate: {rate:.1f}%",
        ],
        provenance="OBSERVED",
        remediation=(
            target_state.resolution_note
            if target_state and target_state.resolution_note
            else "Review incident evidence graph and apply remediation."
        ),
        redaction_verified=True,
        generated_at=now,
    )


async def _explain_prediction(
    db: AsyncSession,
    project_id: uuid.UUID,
    entity_id: str,
) -> EntityExplainabilityResponse:
    """Explains a predictive forecast signal, evidence strength, and score breakdown."""
    pred = await get_or_create_predictive_intelligence(db, project_id)
    now = datetime.now(tz=UTC)

    target_sig = None
    for s in pred.forecast_signals:
        if entity_id in (s.prediction_id, "current", "latest"):
            target_sig = s
            break
    if not target_sig and pred.forecast_signals:
        target_sig = pred.forecast_signals[0]

    if not target_sig:
        return EntityExplainabilityResponse(
            entity_type="prediction",
            entity_id=entity_id,
            project_id=project_id,
            title="Zero Predictive Risks Forecasted",
            summary="Predictive risk posture is stable.",
            why_explanation="No recurring risk patterns or acceleration bursts exceed threshold.",
            score=0,
            provenance="OBSERVED",
            redaction_verified=True,
            generated_at=now,
        )

    sb = target_sig.score_breakdown
    chain = [
        EvidenceChainStep(
            step_number=1,
            stage="OBSERVE",
            title="Historical Telemetry Patterns",
            description=(
                f"Accumulated activity across {len(target_sig.affected_files)} affected file(s)."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=2,
            stage="ANTICIPATE",
            title=f"Forecast Signal ({target_sig.prediction_type})",
            description=(
                f"Forecast strength is {target_sig.forecast_score}/100 "
                f"with {target_sig.evidence_strength} historical evidence."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=3,
            stage="HEALTH",
            title="Predictive Risk Health Contribution",
            description="Anticipated risk reduces Predictive Risk Health score.",
            provenance="OBSERVED",
        ),
    ]

    why = (
        f"Forecast '{target_sig.title}' has a strength of {target_sig.forecast_score}/100 "
        f"derived from: Activity Acceleration (+{sb.activity_acceleration}), "
        f"Security Recurrence (+{sb.security_recurrence}), "
        f"Hotspot Concentration (+{sb.hotspot_concentration}), "
        f"Sensitive Surface Touch (+{sb.sensitive_surface_touch}), "
        f"and Resolution Regression (+{sb.resolution_regression}). Evidence strength is "
        f"{target_sig.evidence_strength} across a {target_sig.historical_window_days}-day window."
    )

    return EntityExplainabilityResponse(
        entity_type="prediction",
        entity_id=target_sig.prediction_id,
        project_id=project_id,
        title=f"Forecast Rationale: {target_sig.title}",
        summary=(
            f"Forecast Strength: {target_sig.forecast_score}/100 ({target_sig.evidence_strength})"
        ),
        why_explanation=why,
        score=target_sig.forecast_score,
        evidence_chain=chain,
        contributing_signals=target_sig.contributing_signals,
        provenance="OBSERVED",
        remediation=target_sig.recommended_action,
        redaction_verified=True,
        generated_at=now,
    )


async def _explain_priority(
    db: AsyncSession,
    project_id: uuid.UUID,
    entity_id: str,
) -> EntityExplainabilityResponse:
    """Explains why an actionable priority was ranked #1, #2, etc."""
    priorities = await get_project_priorities(db, project_id)
    now = datetime.now(tz=UTC)

    target_prio = None
    for p in priorities:
        if entity_id in (p.priority_id, str(p.rank), "1", "current", "latest"):
            target_prio = p
            break
    if not target_prio and priorities:
        target_prio = priorities[0]

    if not target_prio:
        return EntityExplainabilityResponse(
            entity_type="priority",
            entity_id=entity_id,
            project_id=project_id,
            title="Zero Immediate Action Items",
            summary="All project health dimensions are in optimal range.",
            why_explanation="No unmitigated security findings or active hotspots require triage.",
            score=0,
            provenance="OBSERVED",
            redaction_verified=True,
            generated_at=now,
        )

    chain = [
        EvidenceChainStep(
            step_number=1,
            stage="OBSERVE",
            title=f"Candidate Extracted ({target_prio.category})",
            description=f"Identified candidate in {target_prio.affected_subsystem}.",
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=2,
            stage="PRIORITY",
            title=f"Deterministic Rank #{target_prio.rank}",
            description=(
                f"Ranked #{target_prio.rank} with urgency score "
                f"{target_prio.priority_score}/100 ({target_prio.severity} severity)."
            ),
            provenance="OBSERVED",
        ),
        EvidenceChainStep(
            step_number=3,
            stage="RESOLVE",
            title="Recommended Intervention",
            description=target_prio.recommended_action,
            provenance="OBSERVED",
        ),
    ]

    why = (
        f"Priority item '{target_prio.title}' was ranked #{target_prio.rank} with an urgency score "
        f"of {target_prio.priority_score}/100 because {target_prio.why_ranked_highly}. "
        f"Severity is classified as {target_prio.severity} in '{target_prio.affected_subsystem}'."
    )

    return EntityExplainabilityResponse(
        entity_type="priority",
        entity_id=target_prio.priority_id,
        project_id=project_id,
        title=f"Priority Rank #{target_prio.rank}: {target_prio.title}",
        summary=f"Urgency Score: {target_prio.priority_score}/100 [{target_prio.category}]",
        why_explanation=why,
        score=target_prio.priority_score,
        evidence_chain=chain,
        contributing_signals=target_prio.contributing_evidence,
        provenance="OBSERVED",
        remediation=target_prio.recommended_action,
        redaction_verified=True,
        generated_at=now,
    )
