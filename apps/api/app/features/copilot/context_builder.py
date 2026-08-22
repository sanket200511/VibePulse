"""
Evidence Context Builder (Sprint 12 Hardened).

Synthesizes a normalized, evidence-grounded CopilotEvidenceContext
with strict tri-state provenance ([OBSERVED], [INFERRED], [UNKNOWN]),
robust Answerability Gate determination, and complete secret redaction.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from app.features.copilot.retriever import RetrievedDomainData
from app.features.copilot.schemas import (
    CopilotEvidenceContext,
    CopilotFactItem,
    CopilotIntent,
)

# Secret redaction pattern for Sprint 12
_SECRET_PATTERN = re.compile(
    r"\b(?:VIBEPULSE_SPRINT\d+_SECRET_\d+|sk_live_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+|AKIA[A-Z0-9]{16}|[A-Za-z0-9+/]{40})\b",
    re.IGNORECASE,
)


def _mask_secret(text: str) -> str:
    """Mask raw credential tokens to [REDACTED]."""
    if not text:
        return ""
    return _SECRET_PATTERN.sub("[REDACTED]", text)


def build_evidence_context(
    data: RetrievedDomainData,
    query: str,
    intent: CopilotIntent,
    target_entities: list[str],
) -> CopilotEvidenceContext:
    """
    Constructs a normalized CopilotEvidenceContext from retrieved canonical data.
    Evaluates the Answerability Gate and partitions facts by provenance.
    """
    now = datetime.now(tz=UTC)
    project = data.project
    health = data.health
    sec = data.sec_intel
    pred = data.pred_intel
    graph = data.graph
    events = data.events
    priorities = data.priorities

    observed_facts: list[CopilotFactItem] = []
    inferred_facts: list[CopilotFactItem] = []
    unknowns: list[CopilotFactItem] = []
    evidence_references: list[str] = []

    # ── 1. GLOBAL BASELINE FACTS ──────────────────────────────────────────────
    if events:
        observed_facts.append(
            CopilotFactItem(
                statement=(
                    f"Telemetry observation contains {len(events)} events across "
                    f"{len(graph.nodes)} semantic entities."
                ),
                provenance="OBSERVED",
                category="ACTIVITY",
                source_reference=f"events_count:{len(events)}",
            )
        )
    else:
        unknowns.append(
            CopilotFactItem(
                statement=(
                    "No historical development telemetry recorded in PostgreSQL for this project."
                ),
                provenance="UNKNOWN",
                category="ACTIVITY",
                source_reference="events:0",
            )
        )

    # ── 2. DOMAIN-SPECIFIC FACTS BY INTENT ────────────────────────────────────

    # A. Project Health & Priorities
    inferred_facts.append(
        CopilotFactItem(
            statement=(
                f"Overall Project Health Score is {health.overall_health_score}/100 "
                f"({health.grade}, status: {health.status})."
            ),
            provenance="INFERRED",
            category="HEALTH",
            source_reference=f"health:{health.overall_health_score}",
        )
    )

    dimensions = [
        health.security_health,
        health.engineering_stability,
        health.incident_health,
        health.resolution_health,
        health.predictive_risk_health,
    ]
    for dim in dimensions:
        inferred_facts.append(
            CopilotFactItem(
                statement=f"Health Dimension '{dim.name}' score: {dim.score}/100 ({dim.status}).",
                provenance="INFERRED",
                category="HEALTH_DIMENSION",
                source_reference=dim.dimension_key,
            )
        )

    if priorities:
        for p in priorities[:3]:
            inferred_facts.append(
                CopilotFactItem(
                    statement=(
                        f"Priority #{p.rank}: {p.title} "
                        f"(Severity: {p.severity}, Urgency: {p.priority_score}/100). "
                        f"{p.recommended_action}"
                    ),
                    provenance="INFERRED",
                    category="PRIORITY",
                    source_reference=p.priority_id,
                )
            )
            evidence_references.append(p.priority_id)

    # B. Security & AST Findings
    findings = sec.security_findings
    if findings:
        for f in findings[:5]:
            clean_msg = _mask_secret(
                getattr(f, "description", getattr(f, "title", "Security finding"))
            )
            clean_file = f.file_path or "unknown_file"
            observed_facts.append(
                CopilotFactItem(
                    statement=(
                        f"Security Rule {f.rule_id} ({f.severity}) detected in "
                        f"{clean_file}: {clean_msg}"
                    ),
                    provenance="OBSERVED",
                    category="SECURITY",
                    source_reference=f.finding_id,
                )
            )
            evidence_references.append(f.finding_id)

        sec_risk_score = sum(f.risk_contribution for f in findings)
        inferred_facts.append(
            CopilotFactItem(
                statement=(
                    f"Security risk score is +{sec_risk_score} points from "
                    f"{len(findings)} unmitigated findings."
                ),
                provenance="INFERRED",
                category="SECURITY",
                source_reference="security_posture",
            )
        )
    else:
        observed_facts.append(
            CopilotFactItem(
                statement=(
                    "No unmitigated AST security violations detected in the "
                    "observed repository surface."
                ),
                provenance="OBSERVED",
                category="SECURITY",
                source_reference="findings:0",
            )
        )

    # C. Correlated Incidents, Causes & Criticality
    incidents = sec.correlated_incidents
    if incidents:
        for inc in incidents[:3]:
            rev_st = data.review_states.get(inc.incident_id)
            effective_status = rev_st.status if rev_st else "OPEN"
            observed_facts.append(
                CopilotFactItem(
                    statement=(
                        f"Correlated Incident {inc.incident_id} ({inc.severity}, "
                        f"status: {effective_status}, risk: {inc.risk_score}/100): {inc.title}"
                    ),
                    provenance="OBSERVED",
                    category="INCIDENT",
                    source_reference=inc.incident_id,
                )
            )
            evidence_references.append(inc.incident_id)

            if intent in ("INCIDENT_CRITICALITY", "INCIDENT_CAUSE"):
                inferred_facts.append(
                    CopilotFactItem(
                        statement=(
                            f"Incident {inc.incident_id} is ranked {inc.severity} because "
                            f"it contributes +{inc.risk_score} risk points across "
                            f"{len(inc.affected_files)} affected files."
                        ),
                        provenance="INFERRED",
                        category="INCIDENT_REASONING",
                        source_reference=inc.incident_id,
                    )
                )
    else:
        observed_facts.append(
            CopilotFactItem(
                statement="Zero active security incidents correlated in the observed telemetry.",
                provenance="OBSERVED",
                category="INCIDENT",
                source_reference="incidents:0",
            )
        )

    # D. Resolutions & Review History
    if data.review_histories:
        for rh in data.review_histories[:3]:
            clean_note = _mask_secret(rh.resolution_note or "No note provided")
            observed_facts.append(
                CopilotFactItem(
                    statement=(
                        f"Audit transition for {rh.incident_id} to {rh.new_status} "
                        f"by {rh.reviewer}: {clean_note}"
                    ),
                    provenance="OBSERVED",
                    category="RESOLUTION",
                    source_reference=str(rh.id),
                )
            )
            evidence_references.append(str(rh.id))
    else:
        unknowns.append(
            CopilotFactItem(
                statement="No historical incident review or triage resolution records logged yet.",
                provenance="UNKNOWN",
                category="RESOLUTION",
                source_reference="resolutions:0",
            )
        )

    # E. Predictive Forecasts & Drift
    if pred.forecast_signals:
        for ps in pred.forecast_signals[:3]:
            inferred_facts.append(
                CopilotFactItem(
                    statement=(
                        f"Forecast Signal: {ps.title} (Score: {ps.forecast_score}/100, "
                        f"Evidence: {ps.evidence_strength}). Action: {ps.recommended_action}"
                    ),
                    provenance="INFERRED",
                    category="PREDICTION",
                    source_reference=ps.prediction_id,
                )
            )
            evidence_references.append(ps.prediction_id)
    else:
        observed_facts.append(
            CopilotFactItem(
                statement=(
                    "Predictive engine confirms zero high-risk regression "
                    "forecasts or change bursts."
                ),
                provenance="OBSERVED",
                category="PREDICTION",
                source_reference="forecasts:0",
            )
        )

    # F. Target Entity Deep-Dives (Files & Subsystems)
    for target_file in data.file_intels:
        fi = data.file_intels[target_file]
        observed_facts.append(
            CopilotFactItem(
                statement=(
                    f"File '{fi.file_path}' has {fi.activity_count} observed events, "
                    f"{fi.findings_count} security findings, and belongs to {fi.subsystem}."
                ),
                provenance="OBSERVED",
                category="FILE",
                source_reference=fi.file_path,
            )
        )

    # G. Known Unknowns (Observation Gaps)
    unknowns.append(
        CopilotFactItem(
            statement=(
                "Deployment status to production or staging environments "
                "is not captured by local telemetry."
            ),
            provenance="UNKNOWN",
            category="ENVIRONMENT",
            source_reference="out_of_band",
        )
    )
    if health.status == "INSUFFICIENT_EVIDENCE":
        unknowns.append(
            CopilotFactItem(
                statement=(
                    "Observation window is below statistical baseline threshold (< 5 events)."
                ),
                provenance="UNKNOWN",
                category="STATISTICAL_BASELINE",
                source_reference="baseline_gate",
            )
        )

    # ── 3. ANSWERABILITY DETERMINATION ────────────────────────────────────────
    answerable = True
    reason = "Query is fully grounded in PostgreSQL historical telemetry."
    strength: Any = "STRONG"

    if intent == "UNKNOWN":
        answerable = False
        reason = (
            "The query asks for information outside observed telemetry "
            "domain (e.g. external market prices, weather, politics, or private communications)."
        )
        strength = "INSUFFICIENT"
    elif intent == "FILE" and target_entities:
        target_f = target_entities[0]
        # Check if file was observed
        matched_node = any(
            target_f.lower() in n.label.lower()
            or target_f.lower() in n.metadata.get("file_path", "").lower()
            for n in graph.nodes
            if n.node_type == "File"
        )
        if not matched_node and not events:
            answerable = False
            reason = f"File '{target_f}' has no recorded observation events in this project."
            strength = "INSUFFICIENT"
    elif not events and intent in (
        "SECURITY",
        "INCIDENT",
        "FILE",
        "SUBSYSTEM",
        "PREDICTION",
        "INCIDENT_CAUSE",
        "INCIDENT_CRITICALITY",
    ):
        answerable = False
        reason = "No telemetry events have been recorded for this project yet."
        strength = "INSUFFICIENT"

    relevant_files = [
        n.metadata.get("file_path", n.label) for n in graph.nodes if n.node_type == "File"
    ][:10]

    relevant_subsystems = graph.subsystems

    relevant_incidents = [
        {
            "incident_id": inc.incident_id,
            "title": inc.title,
            "severity": inc.severity,
            "risk_score": inc.risk_score,
            "status": (
                data.review_states[inc.incident_id].status
                if inc.incident_id in data.review_states
                else "OPEN"
            ),
        }
        for inc in sec.correlated_incidents
    ]

    relevant_findings = [
        {
            "finding_id": f.finding_id,
            "rule_id": f.rule_id,
            "severity": f.severity,
            "file_path": f.file_path,
            "message": _mask_secret(
                getattr(f, "description", getattr(f, "title", "Security finding"))
            ),
            "risk_contribution": f.risk_contribution,
        }
        for f in sec.security_findings
    ]

    relevant_predictions = [
        {
            "prediction_id": p.prediction_id,
            "title": p.title,
            "severity": p.severity,
            "forecast_score": p.forecast_score,
            "recommended_action": p.recommended_action,
        }
        for p in pred.forecast_signals
    ]

    relevant_resolutions = [
        {
            "id": str(rh.id),
            "incident_id": rh.incident_id,
            "new_status": rh.new_status,
            "reviewer": rh.reviewer,
            "resolution_note": _mask_secret(rh.resolution_note or ""),
        }
        for rh in data.review_histories
    ]

    relevant_sessions = [
        {
            "id": str(s.id),
            "status": s.status,
            "event_count": s.event_count,
            "started_at": s.started_at.isoformat() if s.started_at else None,
        }
        for s in data.sessions
    ]

    return CopilotEvidenceContext(
        project_id=project.id,
        project_display_name=project.display_name,
        query=_mask_secret(query),
        detected_intent=intent,
        target_entities=[_mask_secret(e) for e in target_entities],
        answerable=answerable,
        answerability_reason=reason,
        evidence_strength=strength,
        observed_facts=observed_facts,
        inferred_facts=inferred_facts,
        unknowns=unknowns,
        relevant_files=relevant_files,
        relevant_subsystems=relevant_subsystems,
        relevant_incidents=relevant_incidents,
        relevant_findings=relevant_findings,
        relevant_predictions=relevant_predictions,
        relevant_resolutions=relevant_resolutions,
        relevant_sessions=relevant_sessions,
        evidence_references=evidence_references,
        health_summary={
            "score": health.overall_health_score,
            "grade": health.grade,
            "status": health.status,
        },
        risk_summary={
            "score": sum(f.risk_contribution for f in sec.security_findings),
            "findings_count": len(sec.security_findings),
        },
        graph_context={
            "total_nodes": graph.total_nodes,
            "total_edges": graph.total_edges,
            "subsystems": graph.subsystems,
        },
        generated_at=now,
    )
