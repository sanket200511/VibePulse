"""
AI Engineering Copilot Service.

Pure, deterministic response composer that answers natural engineering queries
using grounded canonical intelligence without relying on external LLM APIs.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime

from app.core.logging import get_logger
from app.features.copilot.context_builder import _mask_secret, build_evidence_context
from app.features.copilot.query_classifier import classify_query
from app.features.copilot.retriever import retrieve_canonical_domain_data
from app.features.copilot.schemas import (
    CopilotEvidenceContext,
    CopilotRecommendation,
    CopilotResponse,
    CopilotSuggestion,
    EntityReference,
)
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


async def query_copilot(
    db: AsyncSession,
    project_id: uuid.UUID,
    query: str,
    include_raw_context: bool = False,
) -> CopilotResponse:
    """
    Execute a natural engineering query against canonical intelligence.
    Produces a deterministic, evidence-grounded response.
    """
    now = datetime.now(tz=UTC)
    classification = classify_query(query)
    intent = classification.intent
    target_entities = classification.target_entities

    data = await retrieve_canonical_domain_data(db, project_id, target_entities, intent)
    context = build_evidence_context(data, query, intent, target_entities)

    # If unanswerable, produce explanatory grounded response
    if not context.answerable:
        clean_q = _mask_secret(query)
        summary = (
            f"VibePulse cannot definitively answer '{clean_q}' from observed telemetry. "
            f"Reason: {context.answerability_reason}"
        )
        return CopilotResponse(
            query=_mask_secret(query),
            intent=intent,
            answerable=False,
            answerability_reason=context.answerability_reason,
            evidence_strength=context.evidence_strength,
            summary=summary,
            observed=context.observed_facts,
            inferred=context.inferred_facts,
            unknown=context.unknowns,
            recommendations=[
                CopilotRecommendation(
                    title="Observe Repository Activity",
                    explanation=(
                        "Start observation daemon on repository to capture live telemetry."
                    ),
                    category="OBSERVABILITY",
                    priority="HIGH",
                    action_type="INVESTIGATE",
                )
            ],
            evidence=[],
            related_entities=[],
            next_actions=[
                {
                    "label": "Engineering Command Center",
                    "url": f"/projects/{project_id}/command-center",
                },
                {
                    "label": "Knowledge Graph",
                    "url": f"/projects/{project_id}/knowledge-graph",
                },
            ],
            context_package=context if include_raw_context else None,
            generated_at=now,
        )

    # ── DETERMINISTIC RESPONSE SYNTHESIS BY INTENT ────────────────────────────
    recommendations: list[CopilotRecommendation] = []
    related_entities: list[EntityReference] = []
    next_actions: list[dict[str, str]] = []
    summary_parts: list[str] = []

    # Map top priorities to recommendations
    for p in data.priorities[:3]:
        recommendations.append(
            CopilotRecommendation(
                title=f"Priority #{p.rank}: {p.title}",
                explanation=p.recommended_action,
                category=p.category,
                priority=p.severity,
                action_type="REMEDIATE_SECURITY" if "SECURITY" in p.category else "INVESTIGATE",
                target_entity=p.affected_files[0] if p.affected_files else None,
                deep_link_url=p.deep_link_url,
            )
        )

    # Add related entities from findings and incidents
    for f in data.sec_intel.security_findings[:4]:
        f_desc = getattr(f, "description", getattr(f, "title", "Finding"))
        related_entities.append(
            EntityReference(
                entity_id=f.finding_id,
                entity_type="finding",
                label=f"{f.rule_id}: {f_desc[:40]}...",
                subsystem=f.file_path,
                url=f"/projects/{project_id}/investigate",
            )
        )
    for inc in data.sec_intel.correlated_incidents[:3]:
        related_entities.append(
            EntityReference(
                entity_id=inc.incident_id,
                entity_type="incident",
                label=f"{inc.incident_id} ({inc.severity})",
                subsystem=_mask_secret(inc.affected_files[0] if inc.affected_files else ""),
                url=f"/projects/{project_id}/investigate",
            )
        )

    # Intent-specific narrative summary generator
    if intent == "PROJECT_HEALTH":
        h = data.health
        summary_parts.append(
            f"Project '{data.project.display_name}' has an Overall Health Score of "
            f"{h.overall_health_score}/100 ({h.grade}, status: {h.status})."
        )
        if data.priorities:
            top_p = data.priorities[0]
            summary_parts.append(
                f"Your highest urgency action is Priority #{top_p.rank} ({top_p.severity}): "
                f"{top_p.title}. {top_p.why_ranked_highly}"
            )
        else:
            summary_parts.append(
                "All health dimensions are optimal with zero active blocking priorities."
            )

    elif intent == "SECURITY":
        findings_count = len(data.sec_intel.security_findings)
        risk_score = sum(f.risk_contribution for f in data.sec_intel.security_findings)
        if findings_count > 0:
            top_f = data.sec_intel.security_findings[0]
            f_title_desc = getattr(top_f, "description", getattr(top_f, "title", "Finding"))
            clean_msg = _mask_secret(f_title_desc)
            summary_parts.append(
                f"Security Intelligence reports {findings_count} unmitigated AST findings "
                f"contributing +{risk_score} risk points. "
                f"Primary vulnerability is {top_f.rule_id} ({top_f.severity}) in "
                f"{top_f.file_path}: {clean_msg}"
            )
        else:
            summary_parts.append(
                "Security posture is clean. Zero AST violations in observed files."
            )

    elif intent == "FILE":
        target_f = target_entities[0] if target_entities else "targeted file"
        fi = data.file_intels.get(target_f)
        if fi:
            summary_parts.append(
                f"File '{fi.file_path}' belongs to subsystem '{fi.subsystem}' with "
                f"{fi.activity_count} observed changes. It is associated with {fi.findings_count} "
                f"security findings and {fi.incidents_count} correlated incidents."
            )
        else:
            summary_parts.append(
                f"File '{target_f}' is indexed with {len(data.events)} recent events."
            )

    elif intent == "SUBSYSTEM":
        target_sub = target_entities[0] if target_entities else data.graph.subsystems[0]
        si = data.subsys_intels.get(target_sub)
        if si:
            summary_parts.append(
                f"Subsystem '{si.subsystem_name}' contains {si.file_count} files with "
                f"{si.activity_count} observed events. Subsystem risk contribution is "
                f"+{si.risk_score} points ({si.health_status}) with "
                f"{si.open_incidents_count} open incidents."
            )
        else:
            summary_parts.append(
                f"Subsystems currently active in graph: {', '.join(data.graph.subsystems)}."
            )

    elif intent == "PREDICTION":
        signals = data.pred_intel.forecast_signals
        if signals:
            top_sig = signals[0]
            summary_parts.append(
                f"Predictive Intelligence detected {len(signals)} forecast signals. "
                f"Highest risk: {top_sig.title} (Strength: {top_sig.evidence_strength}, "
                f"Score: {top_sig.forecast_score}/100). Recommended: {top_sig.recommended_action}"
            )
        else:
            summary_parts.append(
                "Predictive engine detects stable trajectory with zero failure forecasts."
            )

    elif intent == "INCIDENT":
        incidents = data.sec_intel.correlated_incidents
        if incidents:
            top_inc = incidents[0]
            summary_parts.append(
                f"Incident {top_inc.incident_id} ({top_inc.severity}, "
                f"Risk: {top_inc.risk_score}/100) was correlated across "
                f"{len(top_inc.affected_files)} files: {top_inc.title}"
            )
        else:
            summary_parts.append(
                "No active security incidents are currently open for this project."
            )

    elif intent == "RESOLUTION":
        if data.review_histories:
            top_rh = data.review_histories[0]
            clean_note = _mask_secret(top_rh.resolution_note or "Resolution logged")
            summary_parts.append(
                f"Most recent triage resolution: Incident {top_rh.incident_id} "
                f"transitioned to {top_rh.new_status} by {top_rh.reviewer} ({clean_note})."
            )
        else:
            summary_parts.append("Zero triage resolutions have been logged yet in PostgreSQL.")

    elif intent == "KNOWLEDGE_GRAPH":
        g = data.graph
        subsys_list = ", ".join(g.subsystems)
        summary_parts.append(
            f"The Knowledge Graph maps {g.total_nodes} entities connected by "
            f"{g.total_edges} relationships across {len(g.subsystems)} subsystems "
            f"({subsys_list})."
        )

    elif intent == "EVIDENCE":
        exp = data.evidence_explanations.get("health")
        if exp:
            summary_parts.append(
                f"Health score of {exp.current_score}/100 is decomposed mathematically across "
                f"5 dimensions with [{exp.provenance}] provenance: {exp.summary_explanation}"
            )
        else:
            summary_parts.append("Evidence grounding is derived 100% from PostgreSQL telemetry.")

    else:
        summary_parts.append(
            f"Project '{data.project.display_name}' summary: {len(data.graph.nodes)} entities, "
            f"{len(data.events)} events, Health: {data.health.overall_health_score}/100."
        )

    summary = " ".join(summary_parts)

    next_actions = [
        {"label": "Engineering Command Center", "url": f"/projects/{project_id}/command-center"},
        {"label": "Knowledge Graph", "url": f"/projects/{project_id}/knowledge-graph"},
        {"label": "Investigation Engine", "url": f"/projects/{project_id}/investigate"},
        {"label": "Security Center", "url": f"/projects/{project_id}/security"},
    ]

    return CopilotResponse(
        query=_mask_secret(query),
        intent=intent,
        answerable=True,
        answerability_reason=context.answerability_reason,
        evidence_strength=context.evidence_strength,
        summary=summary,
        observed=context.observed_facts,
        inferred=context.inferred_facts,
        unknown=context.unknowns,
        recommendations=recommendations,
        evidence=[{"id": ref} for ref in context.evidence_references],
        related_entities=related_entities,
        next_actions=next_actions,
        context_package=context if include_raw_context else None,
        generated_at=now,
    )


async def get_copilot_context(db: AsyncSession, project_id: uuid.UUID) -> CopilotEvidenceContext:
    """Generate complete AI-ready Copilot evidence package for a project."""
    data = await retrieve_canonical_domain_data(db, project_id, [], "PROJECT_OVERVIEW")
    return build_evidence_context(data, "Project Overview", "PROJECT_OVERVIEW", [])


async def get_copilot_suggestions(
    db: AsyncSession, project_id: uuid.UUID
) -> list[CopilotSuggestion]:
    """
    Generate dynamic, state-driven question suggestions based on actual project telemetry.
    """
    data = await retrieve_canonical_domain_data(db, project_id, [], "PROJECT_OVERVIEW")
    suggestions: list[CopilotSuggestion] = []

    # 1. Priorities
    if data.priorities:
        top_p = data.priorities[0]
        suggestions.append(
            CopilotSuggestion(
                suggestion_id="sug-fix-first",
                category="HEALTH",
                question="What should I fix first?",
                rationale=f"Active priority #{top_p.rank} ({top_p.severity}) requires attention.",
                priority_level="HIGH",
            )
        )
    elif data.sec_intel.security_findings:
        top_f = data.sec_intel.security_findings[0]
        suggestions.append(
            CopilotSuggestion(
                suggestion_id="sug-fix-first",
                category="HEALTH",
                question="What should I fix first?",
                rationale=f"Remediate security finding {top_f.rule_id} ({top_f.severity}).",
                priority_level="HIGH",
            )
        )

    # 2. Security findings
    if data.sec_intel.security_findings:
        top_f = data.sec_intel.security_findings[0]
        f_name = os.path.basename(top_f.file_path or "config")
        suggestions.append(
            CopilotSuggestion(
                suggestion_id="sug-sec-risk",
                category="SECURITY",
                question=f"Why is {top_f.rule_id} putting this project at risk?",
                rationale=f"Rule {top_f.rule_id} detected in {f_name}.",
                priority_level="HIGH",
            )
        )

    # 3. Subsystem pressure
    if data.graph.subsystems:
        top_sub = data.graph.subsystems[0]
        suggestions.append(
            CopilotSuggestion(
                suggestion_id="sug-sub-pressure",
                category="SUBSYSTEMS",
                question=f"How healthy is the {top_sub} subsystem?",
                rationale="Active subsystem with observed activity in knowledge graph.",
                priority_level="MEDIUM",
            )
        )

    # 4. Predictions / Forecasts
    if data.pred_intel.forecast_signals:
        top_sig = data.pred_intel.forecast_signals[0]
        suggestions.append(
            CopilotSuggestion(
                suggestion_id="sug-pred-problem",
                category="PREDICTIONS",
                question="What could become a problem next?",
                rationale=f"Forecast signal detected: {top_sig.title}.",
                priority_level="HIGH",
            )
        )

    # 5. Connected files / Knowledge Graph
    file_nodes = [n for n in data.graph.nodes if n.node_type == "File"]
    if file_nodes:
        top_file = file_nodes[0]
        suggestions.append(
            CopilotSuggestion(
                suggestion_id="sug-kg-connected",
                category="KNOWLEDGE_GRAPH",
                question=f"What is connected to {top_file.label}?",
                rationale="Traverse relationships and dependencies in the knowledge graph.",
                priority_level="MEDIUM",
            )
        )

    # 6. General baseline suggestions
    suggestions.append(
        CopilotSuggestion(
            suggestion_id="sug-know-dont-know",
            category="GENERAL",
            question="What does VibePulse know about this project?",
            rationale="Review verified project facts, technologies, and observation limits.",
            priority_level="LOW",
        )
    )
    suggestions.append(
        CopilotSuggestion(
            suggestion_id="sug-recent-changes",
            category="GENERAL",
            question="What changed recently?",
            rationale="Chronological summary of development sessions and file modifications.",
            priority_level="LOW",
        )
    )

    return suggestions
