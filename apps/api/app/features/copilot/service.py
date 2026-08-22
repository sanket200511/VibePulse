"""
Copilot Core Service (Sprint 12 Hardened).

Synthesizes deterministic, evidence-backed answers, recommendations,
entity links, and dynamic state-driven suggestions without an LLM.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.logging import get_logger
from app.features.copilot.context_builder import _mask_secret, build_evidence_context
from app.features.copilot.query_classifier import classify_query
from app.features.copilot.retriever import (
    RetrievedDomainData,
    retrieve_canonical_domain_data,
)
from app.features.copilot.schemas import (
    CopilotEvidenceContext,
    CopilotQueryRequest,
    CopilotRecommendation,
    CopilotResponse,
    CopilotSuggestion,
    EntityReference,
)
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


def _compose_summary(
    intent: str,
    data: RetrievedDomainData,
    query: str,
    target_entities: list[str],
) -> str:
    """Deterministically compose natural engineering narrative based on intent."""
    health = data.health
    sec = data.sec_intel
    pred = data.pred_intel
    p_name = data.project.display_name
    priorities = data.priorities

    if intent == "PROJECT_HEALTH":
        f_strength = pred.forecast_signals[0].forecast_score if pred.forecast_signals else 70
        e_tier = pred.forecast_signals[0].evidence_strength if pred.forecast_signals else "MODERATE"
        return (
            f"Project '{p_name}' has an Overall Health Score of "
            f"{health.overall_health_score}/100 ({health.grade}, status: {health.status}). "
            + (
                f"Your highest urgency action is Priority #{priorities[0].rank} "
                f"({priorities[0].severity}): {priorities[0].title}. "
                if priorities
                else "All 5 health dimensions are operating within acceptable boundaries. "
            )
            + (f"Forecast strength is {f_strength}/100 with {e_tier} historical evidence.")
        )

    if intent == "PRIORITY":
        if priorities:
            p0 = priorities[0]
            subsys = getattr(p0, "affected_subsystem", "General")
            return (
                f"Top Recommended Action is Priority #{p0.rank} ({p0.severity}): "
                f"{p0.title} (Urgency: {p0.priority_score}/100). "
                f"Action: {p0.recommended_action}. Target Subsystem: {subsys}."
            )
        return "No high-priority engineering blockers or critical security risks detected."

    if intent == "SECURITY":
        findings = sec.security_findings
        if findings:
            f0 = findings[0]
            clean_desc = _mask_secret(
                getattr(f0, "description", getattr(f0, "title", "AST violation"))
            )
            return (
                f"Security Intelligence detected {len(findings)} unmitigated findings "
                f"(Security Posture: {sec.security_posture}, Risk Contribution: "
                f"+{sum(f.risk_contribution for f in findings)} points). "
                f"Most critical rule: {f0.rule_id} ({f0.severity}) in "
                f"{f0.file_path}: {clean_desc}."
            )
        return (
            "Security posture is clean. Zero AST security violations or "
            "exposed credentials detected in the observed surface."
        )

    if intent == "INCIDENT_CRITICALITY":
        incidents = sec.correlated_incidents
        if incidents:
            inc = incidents[0]
            return (
                f"Incident {inc.incident_id} is classified as {inc.severity} "
                f"(Risk Score: {inc.risk_score}/100). The classification is driven by "
                f"AST rule violations contributing direct risk weight across "
                f"{len(inc.affected_files)} affected files."
            )
        return "Zero active security incidents correlated in this project."

    if intent == "INCIDENT_CAUSE":
        incidents = sec.correlated_incidents
        if incidents:
            inc = incidents[0]
            return (
                f"Incident {inc.incident_id} was caused by AST security violation "
                f"'{inc.title}' affecting {', '.join(inc.affected_files)}. "
                f"Detected in root telemetry with risk impact of {inc.risk_score}/100."
            )
        return "No incident root causes identified in current telemetry."

    if intent == "INCIDENT":
        incidents = sec.correlated_incidents
        if incidents:
            open_count = sum(
                1
                for inc in incidents
                if getattr(data.review_states.get(inc.incident_id), "status", "OPEN") != "RESOLVED"
            )
            return (
                f"There are {open_count} active/unresolved incidents. "
                f"Highest severity incident is {incidents[0].incident_id} "
                f"({incidents[0].severity}): {incidents[0].title}."
            )
        return "No active security incidents correlated in current telemetry."

    if intent == "FILE" and target_entities:
        target_f = target_entities[0]
        fi = data.file_intels.get(target_f)
        if fi:
            return (
                f"File '{fi.file_path}' belongs to subsystem '{fi.subsystem}' with "
                f"{fi.activity_count} observed changes. It is associated with "
                f"{fi.findings_count} security findings and {fi.incidents_count} "
                "correlated incidents."
            )
        return f"File '{target_f}' was analyzed across AST guardrails."

    if intent == "SUBSYSTEM":
        subsystems = data.graph.subsystems
        sub_str = ", ".join(subsystems) if subsystems else "None"
        p_subsys = (
            getattr(data.priorities[0], "affected_subsystem", "General") if priorities else "None"
        )
        return f"Project spans {len(subsystems)} observed subsystems ({sub_str}). " + (
            f"Subsystem '{p_subsys}' is currently under highest remediation pressure."
            if priorities
            else "All subsystems report balanced activity velocity."
        )

    if intent == "PREDICTION":
        signals = pred.forecast_signals
        if signals:
            s0 = signals[0]
            return (
                f"Predictive Engine forecasts {len(signals)} engineering risk signals "
                f"(Forecast Score: {s0.forecast_score}/100, Tier: {s0.evidence_strength}). "
                f"Primary signal: {s0.title} (Severity: {s0.severity}). "
                f"Action: {s0.recommended_action}."
            )
        return (
            "Predictive stability is optimal. No code churn acceleration or "
            "critical failure hotspots forecast for the upcoming sprint."
        )

    if intent == "RESOLUTION":
        if data.review_histories:
            rh0 = data.review_histories[0]
            clean_note = _mask_secret(rh0.resolution_note or "No note provided")
            return (
                f"Latest resolution audit: Incident {rh0.incident_id} was updated to "
                f"{rh0.new_status} by {rh0.reviewer} at "
                f"{rh0.created_at.strftime('%Y-%m-%d %H:%M')}. "
                f"Note: '{clean_note}'."
            )
        return "No historical incident review or triage resolutions logged in audit history."

    if intent == "KNOWLEDGE_GRAPH":
        target = target_entities[0] if target_entities else "the project"
        return (
            f"Knowledge Graph connects {data.graph.total_nodes} semantic entities via "
            f"{data.graph.total_edges} verified relationships (CONTAINS, BELONGS_TO, AFFECTS, "
            f"RESOLVED_BY, SUPPORTS) across {len(data.graph.subsystems)} subsystems for {target}."
        )

    if intent == "ENGINEERING_ACTIVITY":
        ev_count = len(data.events)
        sess_count = len(data.sessions)
        return (
            f"Engineering activity recorded {ev_count} historical telemetry events across "
            f"{sess_count} development sessions. Code velocity is operating in baseline."
        )

    if intent == "AI_HANDOFF" or intent == "PROJECT_OVERVIEW":
        return (
            f"VibePulse Project Memory 2.0 tracks {p_name} across "
            f"{len(data.graph.subsystems)} subsystems with an Overall Health Score of "
            f"{health.overall_health_score}/100 ({health.grade}). "
            "Full portable AI handoff is available in PROJECT_CONTEXT.md Section 20-21."
        )

    if intent == "EVIDENCE":
        return (
            f"Every VibePulse assertion is backed by PostgreSQL telemetry. "
            f"Overall Health {health.overall_health_score}/100 decomposes into: "
            f"Security ({health.security_health.score}), "
            f"Engineering ({health.engineering_stability.score}), "
            f"Incident ({health.incident_health.score}), "
            f"Resolution ({health.resolution_health.score}), "
            f"and Predictive Risk ({health.predictive_risk_health.score})."
        )

    return (
        "The query could not be grounded in local telemetry events. "
        "Please ask about project health, security findings, active incidents, "
        "file changes, predictions, or knowledge graph connections."
    )


def _build_recommendations(data: RetrievedDomainData) -> list[CopilotRecommendation]:
    """Derive prioritized action recommendations directly from canonical intelligence."""
    recs: list[CopilotRecommendation] = []
    p_id = str(data.project.id)

    # 1. Priorities from Unified Project Health
    for p in data.priorities[:2]:
        recs.append(
            CopilotRecommendation(
                title=f"Priority #{p.rank}: {p.title}",
                explanation=p.recommended_action,
                category="HEALTH",
                priority=p.severity if p.severity in ("CRITICAL", "HIGH", "MEDIUM") else "MEDIUM",
                action_type="REVIEW_PRIORITY",
                target_entity=getattr(p, "affected_subsystem", "General"),
                deep_link_url=f"/projects/{p_id}/command-center",
            )
        )

    # 2. Critical/High Security Findings
    for f in data.sec_intel.security_findings:
        if f.severity in ("CRITICAL", "HIGH"):
            clean_desc = _mask_secret(getattr(f, "description", getattr(f, "title", "AST Finding")))
            recs.append(
                CopilotRecommendation(
                    title=f"Remediate {f.rule_id} in {f.file_path or 'code'}",
                    explanation=f"Apply fix for {f.severity} finding: {clean_desc}",
                    category="SECURITY",
                    priority=f.severity,
                    action_type="REMEDIATE_SECURITY",
                    target_entity=f.file_path or "",
                    deep_link_url=f"/projects/{p_id}/investigate",
                )
            )
            break

    # 3. Forecast Signals
    for s in data.pred_intel.forecast_signals:
        if s.severity in ("CRITICAL", "HIGH"):
            recs.append(
                CopilotRecommendation(
                    title=f"Mitigate Risk Signal: {s.title}",
                    explanation=s.recommended_action,
                    category="PREDICTION",
                    priority=s.severity,
                    action_type="MITIGATE_PREDICTION",
                    target_entity=s.prediction_id,
                    deep_link_url=f"/projects/{p_id}/predictions",
                )
            )
            break

    return recs[:3]


def _build_related_entities(
    data: RetrievedDomainData, target_entities: list[str]
) -> list[EntityReference]:
    """Build concrete entity references for deep-linking."""
    refs: list[EntityReference] = []
    p_id = str(data.project.id)

    # Add project entity
    refs.append(
        EntityReference(
            entity_id=p_id,
            entity_type="project",
            label=data.project.display_name,
            subsystem=None,
            url=f"/projects/{p_id}/command-center",
            metadata={"root_path": data.project.root_path},
        )
    )

    # Add active security findings
    for f in data.sec_intel.security_findings[:3]:
        clean_msg = _mask_secret(getattr(f, "description", getattr(f, "title", "Security finding")))
        refs.append(
            EntityReference(
                entity_id=f.finding_id,
                entity_type="finding",
                label=f"{f.rule_id}: {clean_msg[:40]}...",
                subsystem=f.file_path,
                url=f"/projects/{p_id}/investigate",
                metadata={"severity": f.severity, "rule_id": f.rule_id},
            )
        )

    # Add active incidents
    for inc in data.sec_intel.correlated_incidents[:2]:
        refs.append(
            EntityReference(
                entity_id=inc.incident_id,
                entity_type="incident",
                label=f"{inc.incident_id}: {inc.title}",
                subsystem=(inc.affected_files[0] if inc.affected_files else None),
                url=f"/projects/{p_id}/investigate",
                metadata={"severity": inc.severity, "risk_score": inc.risk_score},
            )
        )

    return refs


async def query_copilot(
    db: AsyncSession,
    project_id: uuid.UUID,
    request: CopilotQueryRequest,
) -> CopilotResponse:
    """
    Main entrypoint to execute a natural engineering query against canonical intelligence.
    """
    q_text = request.query.strip()

    # 1. Classify intent & extract entity tokens
    classification = classify_query(q_text)

    # 2. Retrieve multi-domain canonical data
    domain_data = await retrieve_canonical_domain_data(
        db,
        project_id,
        classification.target_entities,
        classification.intent,
    )

    # 3. Build normalized evidence context with tri-state facts & answerability gate
    ctx = build_evidence_context(
        domain_data,
        q_text,
        classification.intent,
        classification.target_entities,
    )

    # 4. Synthesize narrative summary & recommendations
    summary = _compose_summary(
        classification.intent,
        domain_data,
        q_text,
        classification.target_entities,
    )
    recommendations = _build_recommendations(domain_data)
    related_entities = _build_related_entities(domain_data, classification.target_entities)

    next_actions = [
        {"label": "Engineering Command Center", "url": f"/projects/{project_id}/command-center"},
        {"label": "Universal Evidence Inspector", "url": f"/projects/{project_id}/evidence"},
        {"label": "Knowledge Graph", "url": f"/projects/{project_id}/knowledge-graph"},
    ]

    return CopilotResponse(
        query=_mask_secret(q_text),
        intent=classification.intent,
        answerable=ctx.answerable,
        answerability_reason=ctx.answerability_reason,
        evidence_strength=ctx.evidence_strength,
        summary=summary,
        observed=ctx.observed_facts,
        inferred=ctx.inferred_facts,
        unknown=ctx.unknowns,
        recommendations=recommendations,
        evidence=[
            {"id": ref, "type": "canonical_reference"} for ref in ctx.evidence_references[:5]
        ],
        related_entities=related_entities,
        next_actions=next_actions,
        context_package=ctx if request.include_raw_context else None,
        generated_at=datetime.now(tz=UTC),
    )


async def get_copilot_context(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> CopilotEvidenceContext:
    """Fetch complete normalized CopilotEvidenceContext package."""
    domain_data = await retrieve_canonical_domain_data(
        db,
        project_id,
        [],
        "PROJECT_OVERVIEW",
    )
    return build_evidence_context(
        domain_data,
        "Full project context export",
        "PROJECT_OVERVIEW",
        [],
    )


async def get_copilot_suggestions(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> list[CopilotSuggestion]:
    """Generate dynamic, state-driven question suggestions."""
    domain_data = await retrieve_canonical_domain_data(
        db,
        project_id,
        [],
        "PROJECT_HEALTH",
    )
    suggestions: list[CopilotSuggestion] = []

    # Priority-driven suggestion
    if domain_data.priorities:
        suggestions.append(
            CopilotSuggestion(
                suggestion_id=f"sug-{uuid.uuid4().hex[:8]}",
                question="What should I fix first?",
                intent="PRIORITY",
                category="HEALTH",
                rationale="Active prioritized items need engineer remediation.",
                badge="TOP PRIORITY",
            )
        )

    # Security-driven suggestion
    if domain_data.sec_intel.security_findings:
        f0 = domain_data.sec_intel.security_findings[0]
        suggestions.append(
            CopilotSuggestion(
                suggestion_id=f"sug-{uuid.uuid4().hex[:8]}",
                question="What security issues keep recurring?",
                intent="SECURITY",
                category="SECURITY",
                rationale="Unmitigated AST security rules detected in telemetry.",
                badge="SECURITY",
            )
        )
        if f0.file_path:
            clean_f = f0.file_path.split("/")[-1]
            suggestions.append(
                CopilotSuggestion(
                    suggestion_id=f"sug-{uuid.uuid4().hex[:8]}",
                    question=f"What happened to {clean_f}?",
                    intent="FILE",
                    category="FILES",
                    rationale=f"Investigate changes and security findings in {clean_f}.",
                    badge="FILE",
                )
            )

    # Prediction-driven suggestion
    if domain_data.pred_intel.forecast_signals:
        suggestions.append(
            CopilotSuggestion(
                suggestion_id=f"sug-{uuid.uuid4().hex[:8]}",
                question="What should we watch next?",
                intent="PREDICTION",
                category="PREDICTIONS",
                rationale="Forecast signals and drift detected in historical baseline.",
                badge="PREDICTION",
            )
        )

    # Knowledge graph suggestion
    suggestions.append(
        CopilotSuggestion(
            suggestion_id=f"sug-{uuid.uuid4().hex[:8]}",
            question="What do we know about this project?",
            intent="PROJECT_OVERVIEW",
            category="KNOWLEDGE_GRAPH",
            rationale="Explore full project memory and knowledge graph summary.",
            badge="EXPLORE",
        )
    )

    return suggestions[:5]
