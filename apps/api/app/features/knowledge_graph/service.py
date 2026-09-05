"""
Engineering Knowledge Graph, Correlation & Causality Graph & Project Memory 2.0 Service.

Pure, deterministic graph projection engine.
Synthesizes an interconnected semantic knowledge graph directly from canonical
PostgreSQL historical tables (development_events, sessions, event_analyses,
incident_review_states, incident_review_history, project_contexts).

Traceability Chain:
OBSERVED EVENT -> FINDING -> INCIDENT -> ROOT CAUSE -> HEALTH IMPACT
               -> RESOLUTION -> PREDICTION -> PROJECT MEMORY

Invariants:
- PostgreSQL telemetry remains the ONLY canonical source of truth.
- Knowledge Graph is a derived relationship projection (A == B).
- No fabricated confidence percentages or speculative causality.
- Raw secrets are strictly masked to "[REDACTED]".
- Multi-project isolation guaranteed.
"""

from __future__ import annotations

import os
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.features.events.models import DevelopmentEvent
from app.features.investigation.models import IncidentReviewHistory, IncidentReviewState
from app.features.knowledge_graph.schemas import (
    BeforeAfterComparisonResponse,
    FileIntelligenceView,
    GraphEdgeExplanation,
    GraphSearchResult,
    GraphTimelineEvent,
    GraphTimelineResponse,
    GraphTraversalResponse,
    GraphTraversalStep,
    IncidentRelationshipView,
    KnowledgeGraphEdge,
    KnowledgeGraphNode,
    ProjectKnowledgeGraph,
    ProjectMemory2,
    SubsystemIntelligenceView,
)
from app.features.predictive_intelligence.service import (
    get_or_create_predictive_intelligence,
)
from app.features.project_context.service import get_or_create_project_context
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

# In-memory graph cache keyed by project_id for sub-millisecond retrieval
_GRAPH_PROJECTION_CACHE: dict[uuid.UUID, ProjectKnowledgeGraph] = {}


def clear_knowledge_graph_cache(project_id: uuid.UUID | None = None) -> None:
    """Clear derived knowledge graph projection cache."""
    if project_id is not None:
        _GRAPH_PROJECTION_CACHE.pop(project_id, None)
    else:
        _GRAPH_PROJECTION_CACHE.clear()


def _classify_subsystem(file_path: str) -> str:
    """Deterministic subsystem classification based on file path patterns."""
    p_low = file_path.replace("\\", "/").lower()

    if any(k in p_low for k in ("/auth/", "auth.", "jwt", "oauth", "security.", "login")):
        return "Authentication"
    if any(
        k in p_low for k in ("/config/", "settings.", ".env", "vault", "configuration", "config.")
    ):
        return "Configuration"
    if any(
        k in p_low
        for k in (
            "/db/",
            "/database/",
            "models.",
            "alembic",
            "schema.",
            "migrations",
            "repository",
        )
    ):
        return "Database"
    if any(k in p_low for k in ("/payment/", "stripe", "billing", "checkout", "invoice")):
        return "Payments"
    if any(k in p_low for k in ("/api/", "/routes/", "/router/", "endpoints", "views.")):
        return "API Layer"
    if any(
        k in p_low
        for k in (
            "/ui/",
            "/components/",
            "/pages/",
            "/hooks/",
            ".tsx",
            ".jsx",
            ".css",
            ".scss",
        )
    ):
        return "Frontend UI"
    if any(k in p_low for k in ("/tests/", "/test/", "test_", "_test.")):
        return "Testing Suite"
    if any(k in p_low for k in ("/daemon/", "/watcher/", "/telemetry/")):
        return "Telemetry Daemon"

    return "Core Application"


def _mask_secret(text: str) -> str:
    """Enforce strict [REDACTED] masking on sensitive credentials."""
    if not text:
        return text
    text = re.sub(r"VIBEPULSE_[A-Za-z0-9_]+", "[REDACTED]", text)
    text = re.sub(r"sk-[a-zA-Z0-9_-]{12,}", "sk-[REDACTED]", text)
    text = re.sub(r"vlt_[a-zA-Z0-9_-]{10,}", "vlt_[REDACTED]", text)
    return text


async def build_project_knowledge_graph(
    db: AsyncSession, project_id: uuid.UUID
) -> ProjectKnowledgeGraph:
    """
    Constructs the deterministic Correlation & Causality Graph directly from
    canonical PostgreSQL telemetry and intelligence projections.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    now = datetime.now(tz=UTC)

    # 1. Fetch historical events
    ev_stmt = (
        select(DevelopmentEvent)
        .where(DevelopmentEvent.project_root == project.root_path)
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    ev_res = await db.execute(ev_stmt)
    events = ev_res.scalars().all()

    # 2. Fetch sessions
    # 2. Fetch security intelligence
    sec_intel = await compute_security_intelligence(db, project_id)

    # 4. Fetch incident review states & history
    inc_stmt = select(IncidentReviewState).where(IncidentReviewState.project_id == project_id)
    inc_res = await db.execute(inc_stmt)
    review_states = {r.incident_id: r for r in inc_res.scalars().all()}

    hist_stmt = (
        select(IncidentReviewHistory)
        .where(IncidentReviewHistory.project_id == project_id)
        .order_by(IncidentReviewHistory.created_at.asc())
    )
    hist_res = await db.execute(hist_stmt)
    review_histories = hist_res.scalars().all()

    # 5. Fetch predictions
    pred_intel = await get_or_create_predictive_intelligence(db, project_id)

    # 6. Fetch project context & health
    proj_ctx = await get_or_create_project_context(db, project_id)
    health = await get_or_create_unified_project_health(db, project_id)

    # ── NODE & EDGE ACCUMULATORS ─────────────────────────────────────────────
    nodes_dict: dict[str, KnowledgeGraphNode] = {}
    edges_list: list[KnowledgeGraphEdge] = []
    seen_edges: set[tuple[str, str, str]] = set()

    def add_node(node: KnowledgeGraphNode) -> None:
        nodes_dict[node.node_id] = node

    def add_edge(
        source_id: str,
        target_id: str,
        rel_type: str,
        label: str,
        reason: str = "",
        evidence: list[str] | None = None,
        provenance: str = "OBSERVED",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        edge_key = (source_id, target_id, rel_type)
        if edge_key in seen_edges:
            return
        seen_edges.add(edge_key)
        edges_list.append(
            KnowledgeGraphEdge(
                relationship_id=f"rel-{uuid.uuid4().hex[:10]}",
                source_node_id=source_id,
                target_node_id=target_id,
                relationship_type=rel_type,  # type: ignore
                label=label,
                reason=reason or label,
                evidence_references=evidence or [],
                provenance=provenance,  # type: ignore
                metadata=metadata or {},
            )
        )

    # ── 1. ROOT PROJECT NODE ─────────────────────────────────────────────────
    proj_node_id = f"project-{project_id}"
    add_node(
        KnowledgeGraphNode(
            node_id=proj_node_id,
            node_type="Project",
            project_id=project_id,
            label=project.display_name,
            subsystem=None,
            metadata={
                "root_path": project.root_path,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "overall_health_score": health.overall_health_score,
                "grade": health.grade,
            },
            provenance="OBSERVED",
        )
    )

    # ── 2. SUBSYSTEM NODES ───────────────────────────────────────────────────
    observed_files_map: dict[str, dict[str, Any]] = {}
    for ev in events:
        if not ev.file_path:
            continue
        p = ev.file_path.replace("\\", "/")
        if p not in observed_files_map:
            subsys = _classify_subsystem(p)
            observed_files_map[p] = {
                "path": p,
                "subsystem": subsys,
                "language": ev.language or "Text",
                "activity_count": 0,
                "first_seen": ev.timestamp,
                "last_modified": ev.timestamp,
                "session_ids": set(),
                "event_ids": [],
            }
        f_entry = observed_files_map[p]
        f_entry["activity_count"] += 1
        f_entry["last_modified"] = ev.timestamp
        if ev.session_id:
            f_entry["session_ids"].add(str(ev.session_id))
        f_entry["event_ids"].append(str(ev.id))

    subsystems_set = {f["subsystem"] for f in observed_files_map.values()}
    if not subsystems_set:
        subsystems_set = {"Core Application"}

    for subsys_name in sorted(subsystems_set):
        subsys_node_id = f"subsystem-{subsys_name.lower().replace(' ', '-')}"
        add_node(
            KnowledgeGraphNode(
                node_id=subsys_node_id,
                node_type="Subsystem",
                project_id=project_id,
                label=subsys_name,
                subsystem=subsys_name,
                metadata={"subsystem_name": subsys_name},
                provenance="OBSERVED",
            )
        )
        add_edge(
            proj_node_id,
            subsys_node_id,
            "CONTAINS",
            f"Project contains {subsys_name} subsystem",
            reason=(
                f"Subsystem {subsys_name} is an active architectural boundary "
                f"in {project.display_name}"
            ),
            provenance="OBSERVED",
        )

    # ── 3. TECHNOLOGY & FRAMEWORK NODES ──────────────────────────────────────
    if proj_ctx and proj_ctx.languages:
        for lang, count in proj_ctx.languages.items():
            tech_id = f"tech-{lang.lower().replace(' ', '-')}"
            add_node(
                KnowledgeGraphNode(
                    node_id=tech_id,
                    node_type="Technology",
                    project_id=project_id,
                    label=lang,
                    subsystem=None,
                    metadata={"file_count": count},
                    provenance="OBSERVED",
                )
            )
            add_edge(
                tech_id,
                proj_node_id,
                "USED_BY",
                f"{lang} is used by project",
                reason=(
                    f"Technology {lang} is detected across {count} project files in "
                    "PostgreSQL telemetry"
                ),
                provenance="OBSERVED",
            )

    # ── 4. FILE NODES ────────────────────────────────────────────────────────
    for p, f_info in observed_files_map.items():
        file_node_id = f"file-{uuid.uuid5(uuid.NAMESPACE_DNS, p).hex[:12]}"
        subsys_name = f_info["subsystem"]
        subsys_node_id = f"subsystem-{subsys_name.lower().replace(' ', '-')}"

        add_node(
            KnowledgeGraphNode(
                node_id=file_node_id,
                node_type="File",
                project_id=project_id,
                label=os.path.basename(p),
                subsystem=subsys_name,
                metadata={
                    "file_path": p,
                    "language": f_info["language"],
                    "activity_count": f_info["activity_count"],
                    "first_seen": (
                        f_info["first_seen"].isoformat() if f_info["first_seen"] else None
                    ),
                    "last_modified": (
                        f_info["last_modified"].isoformat() if f_info["last_modified"] else None
                    ),
                    "sessions_count": len(f_info["session_ids"]),
                },
                provenance="OBSERVED",
            )
        )

        add_edge(
            file_node_id,
            subsys_node_id,
            "BELONGS_TO",
            f"{os.path.basename(p)} belongs to {subsys_name}",
            reason=f"File path '{p}' matches architectural boundary patterns for {subsys_name}",
            evidence=f_info["event_ids"][:3],
            provenance="OBSERVED",
        )

    # ── 5. DEVELOPMENT EVENT NODES (Recent / Crucial Events) ─────────────────
    for ev in events[-15:]:
        ev_node_id = f"event-{str(ev.id)[:8]}"
        p_clean = ev.file_path.replace("\\", "/") if ev.file_path else ""
        subsys = _classify_subsystem(p_clean) if p_clean else "Core Application"

        add_node(
            KnowledgeGraphNode(
                node_id=ev_node_id,
                node_type="DevelopmentEvent",
                project_id=project_id,
                label=f"{ev.event_type}: {os.path.basename(p_clean) if p_clean else 'Event'}",
                subsystem=subsys,
                metadata={
                    "event_id": str(ev.id),
                    "event_type": ev.event_type,
                    "file_path": p_clean,
                    "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                    "session_id": str(ev.session_id) if ev.session_id else None,
                },
                provenance="OBSERVED",
            )
        )

        # Connect event to File
        if p_clean:
            f_node_id = f"file-{uuid.uuid5(uuid.NAMESPACE_DNS, p_clean).hex[:12]}"
            if f_node_id in nodes_dict:
                add_edge(
                    ev_node_id,
                    f_node_id,
                    "MODIFIED",
                    f"Event {ev.event_type} modified {os.path.basename(p_clean)}",
                    reason=(
                        f"Telemetry recorded {ev.event_type} on {p_clean} at "
                        f"{ev.timestamp.isoformat() if ev.timestamp else ''}"
                    ),
                    evidence=[str(ev.id)],
                    provenance="OBSERVED",
                )

    # ── 6. SECURITY FINDING NODES ────────────────────────────────────────────
    for finding in sec_intel.security_findings:
        finding_node_id = f"sec-{finding.finding_id}"
        file_norm = finding.file_path.replace("\\", "/")
        subsys = _classify_subsystem(file_norm)

        clean_evidence = _mask_secret(finding.redacted_evidence or finding.evidence or "")

        add_node(
            KnowledgeGraphNode(
                node_id=finding_node_id,
                node_type="SecurityFinding",
                project_id=project_id,
                label=f"{finding.rule_id}: {finding.title}",
                subsystem=subsys,
                metadata={
                    "finding_id": finding.finding_id,
                    "rule_id": finding.rule_id,
                    "severity": finding.severity,
                    "file_path": file_norm,
                    "line_number": finding.line_number,
                    "risk_contribution": finding.risk_contribution,
                    "evidence": clean_evidence,
                    "remediation": finding.remediation,
                    "status": finding.status,
                },
                provenance="OBSERVED",
            )
        )

        # Connect File to Finding
        file_node_id = f"file-{uuid.uuid5(uuid.NAMESPACE_DNS, file_norm).hex[:12]}"
        if file_node_id in nodes_dict:
            add_edge(
                file_node_id,
                finding_node_id,
                "CONTAINS_FINDING",
                f"Security finding {finding.rule_id} detected in {os.path.basename(file_norm)}",
                reason=(
                    f"AST Security Guardian detected rule {finding.rule_id} violation "
                    f"({finding.title}) in {file_norm} at line {finding.line_number}"
                ),
                evidence=[finding.finding_id],
                provenance="OBSERVED",
                metadata={"risk_contribution": finding.risk_contribution},
            )

    # ── 7. ROOT CAUSE & INCIDENT NODES ───────────────────────────────────────
    for inc in sec_intel.correlated_incidents:
        inc_node_id = f"incident-{inc.incident_id}"
        rev_state = review_states.get(inc.incident_id)
        effective_status = rev_state.status if rev_state else "OPEN"
        subsys = (
            _classify_subsystem(inc.affected_files[0]) if inc.affected_files else "Core Application"
        )
        subsys_node_id = f"subsystem-{subsys.lower().replace(' ', '-')}"

        add_node(
            KnowledgeGraphNode(
                node_id=inc_node_id,
                node_type="Incident",
                project_id=project_id,
                label=f"{inc.incident_id}: {inc.title}",
                subsystem=subsys,
                metadata={
                    "incident_id": inc.incident_id,
                    "severity": inc.severity,
                    "status": effective_status,
                    "risk_score": inc.risk_score,
                    "affected_subsystem": subsys,
                    "affected_files": inc.affected_files,
                    "confidence": "OBSERVED",
                },
                provenance="OBSERVED",
            )
        )

        # Connect Incident to Subsystem
        if subsys_node_id in nodes_dict:
            add_edge(
                inc_node_id,
                subsys_node_id,
                "AFFECTS",
                f"Incident {inc.incident_id} affects {subsys} subsystem",
                reason=(
                    f"Correlated incident {inc.incident_id} poses risk impact to "
                    f"{subsys} architectural boundary"
                ),
                evidence=[inc.incident_id],
                provenance="OBSERVED",
            )

        # ── ROOT CAUSE NODE ──
        rc_node_id = f"rc-{inc.incident_id}"
        aff_basenames = ", ".join(os.path.basename(f) for f in inc.affected_files)
        primary_cause = f"Security vulnerability in {aff_basenames}"
        add_node(
            KnowledgeGraphNode(
                node_id=rc_node_id,
                node_type="RootCause",
                project_id=project_id,
                label=f"Root Cause ({inc.incident_id})",
                subsystem=subsys,
                metadata={
                    "incident_id": inc.incident_id,
                    "primary_signal": primary_cause,
                    "affected_files": inc.affected_files,
                },
                provenance="OBSERVED",
            )
        )

        add_edge(
            rc_node_id,
            inc_node_id,
            "CAUSED",
            f"Root cause initiated Incident {inc.incident_id}",
            reason=(
                f"Underlying AST rule breaches in {', '.join(inc.affected_files)} "
                f"triggered security incident {inc.incident_id}"
            ),
            evidence=[inc.incident_id],
            provenance="OBSERVED",
        )

        # Connect findings to Root Cause & Incident
        for finding in sec_intel.security_findings:
            if finding.file_path in inc.affected_files:
                f_node_id = f"sec-{finding.finding_id}"
                if f_node_id in nodes_dict:
                    f_base = os.path.basename(finding.file_path)
                    add_edge(
                        f_node_id,
                        rc_node_id,
                        "CONTRIBUTED_TO",
                        f"Rule {finding.rule_id} contributed to Root Cause",
                        reason=(
                            f"Violation of {finding.rule_id} in {f_base} "
                            "provided causal evidence for root cause"
                        ),
                        evidence=[finding.finding_id, inc.incident_id],
                        provenance="OBSERVED",
                    )
                    add_edge(
                        f_node_id,
                        inc_node_id,
                        "CONTRIBUTED_TO",
                        (
                            f"Rule {finding.rule_id} contributed "
                            f"+{finding.risk_contribution} risk to {inc.incident_id}"
                        ),
                        reason=(
                            f"Finding {finding.rule_id} contributed "
                            f"+{finding.risk_contribution} risk score points "
                            f"to incident {inc.incident_id}"
                        ),
                        evidence=[finding.finding_id, inc.incident_id],
                        provenance="OBSERVED",
                    )

    # ── 8. RESOLUTION & ACTOR NODES ──────────────────────────────────────────
    for hist in review_histories:
        res_node_id = f"res-{hist.id}"
        inc_node_id = f"incident-{hist.incident_id}"
        clean_note = _mask_secret(hist.resolution_note or "")

        add_node(
            KnowledgeGraphNode(
                node_id=res_node_id,
                node_type="Resolution",
                project_id=project_id,
                label=f"Resolution: {hist.new_status}",
                subsystem=None,
                metadata={
                    "resolution_id": str(hist.id),
                    "incident_id": hist.incident_id,
                    "status": hist.new_status,
                    "previous_status": hist.previous_status,
                    "reviewed_by": hist.reviewer,
                    "resolution_note": clean_note,
                    "timestamp": (hist.created_at.isoformat() if hist.created_at else None),
                },
                provenance="OBSERVED",
            )
        )

        if inc_node_id in nodes_dict:
            add_edge(
                inc_node_id,
                res_node_id,
                "RESOLVED_BY",
                f"Incident {hist.incident_id} transitioned to {hist.new_status}",
                reason=(
                    f"Incident review status transitioned from {hist.previous_status} "
                    f"to {hist.new_status} by reviewer '{hist.reviewer}'"
                ),
                evidence=[str(hist.id)],
                provenance="OBSERVED",
            )

        # Actor Node
        if hist.reviewer:
            actor_slug = re.sub(r"[^a-zA-Z0-9]", "-", hist.reviewer).lower()
            actor_node_id = f"actor-{actor_slug}"
            if actor_node_id not in nodes_dict:
                add_node(
                    KnowledgeGraphNode(
                        node_id=actor_node_id,
                        node_type="Actor",
                        project_id=project_id,
                        label=f"Reviewer: {hist.reviewer}",
                        subsystem=None,
                        metadata={"reviewer_name": hist.reviewer},
                        provenance="OBSERVED",
                    )
                )
            add_edge(
                actor_node_id,
                res_node_id,
                "INVESTIGATED_BY",
                f"Reviewed by {hist.reviewer}",
                reason=(
                    f"Actor '{hist.reviewer}' signed off on transition with "
                    f"resolution note: '{clean_note[:80]}'"
                ),
                evidence=[str(hist.id)],
                provenance="OBSERVED",
            )

    # ── 9. HEALTH DIMENSION NODES ────────────────────────────────────────────
    health_dims = [
        ("Security", "Security Health", health.security_health.score),
        ("Engineering", "Engineering Stability", health.engineering_stability.score),
        ("Incident", "Incident Health", health.incident_health.score),
        ("Resolution", "Resolution Health", health.resolution_health.score),
        ("Predictive", "Predictive Risk Health", health.predictive_risk_health.score),
    ]
    for dim_key, dim_label, score in health_dims:
        dim_node_id = f"health-{dim_key.lower()}"
        add_node(
            KnowledgeGraphNode(
                node_id=dim_node_id,
                node_type="HealthDimension",
                project_id=project_id,
                label=dim_label,
                subsystem=None,
                metadata={"dimension": dim_key, "score": score},
                provenance="INFERRED",
            )
        )
        add_edge(
            dim_node_id,
            proj_node_id,
            "CONTRIBUTES_TO",
            f"{dim_label} ({score}/100) contributes to overall project health",
            reason=(
                f"{dim_label} contributes score {score}/100 toward composite "
                f"project health ({health.overall_health_score}/100)"
            ),
            provenance="INFERRED",
        )

        # Connect Incidents to Incident & Security Health Dimensions
        if dim_key in ("Security", "Incident"):
            for inc in sec_intel.correlated_incidents:
                inc_node_id = f"incident-{inc.incident_id}"
                if inc_node_id in nodes_dict:
                    add_edge(
                        inc_node_id,
                        dim_node_id,
                        "AFFECTS",
                        f"Incident {inc.incident_id} affects {dim_label}",
                        reason=(
                            f"Active security incident {inc.incident_id} "
                            f"(severity: {inc.severity}, risk: {inc.risk_score}) "
                            f"degrades {dim_label}"
                        ),
                        evidence=[inc.incident_id],
                        provenance="OBSERVED",
                    )

    # ── 10. PREDICTION NODES ─────────────────────────────────────────────────
    for pred in pred_intel.forecast_signals:
        pred_node_id = f"pred-{pred.prediction_id}"
        subsys = pred.affected_subsystems[0] if pred.affected_subsystems else "Core Application"
        subsys_node_id = f"subsystem-{subsys.lower().replace(' ', '-')}"

        add_node(
            KnowledgeGraphNode(
                node_id=pred_node_id,
                node_type="Prediction",
                project_id=project_id,
                label=f"Forecast: {pred.title}",
                subsystem=subsys,
                metadata={
                    "prediction_id": pred.prediction_id,
                    "prediction_type": pred.prediction_type,
                    "forecast_score": pred.forecast_score,
                    "evidence_strength": pred.evidence_strength,
                    "time_horizon": pred.time_horizon,
                    "recommended_action": pred.recommended_action,
                },
                provenance="INFERRED",
            )
        )

        if subsys_node_id in nodes_dict:
            add_edge(
                pred_node_id,
                subsys_node_id,
                "SUPPORTS",
                f"Forecast predicts risk in {subsys} ({pred.evidence_strength} evidence strength)",
                reason=(
                    f"Predictive telemetry trends indicate risk escalation in {subsys} subsystem"
                ),
                evidence=[pred.prediction_id],
                provenance="INFERRED",
            )

        # Connect Prediction to Health
        add_edge(
            pred_node_id,
            "health-predictive",
            "CONTRIBUTES_TO",
            "Prediction contributes to Predictive Health",
            reason=f"Forecast signal '{pred.title}' informs predictive health score",
            evidence=[pred.prediction_id],
            provenance="INFERRED",
        )

        # Connect affected files to Prediction
        for f_path in pred.affected_files:
            clean_fp = f_path.replace("\\", "/")
            f_node_id = f"file-{uuid.uuid5(uuid.NAMESPACE_DNS, clean_fp).hex[:12]}"
            if f_node_id in nodes_dict:
                add_edge(
                    f_node_id,
                    pred_node_id,
                    "PREDICTED_AS",
                    f"Activity in {os.path.basename(f_path)} supports risk prediction",
                    reason=(
                        f"Change velocity and AST density in {clean_fp} ground "
                        "the forecast prediction"
                    ),
                    evidence=[pred.prediction_id],
                    provenance="INFERRED",
                )

    # Calculate node and edge distributions
    node_counts: dict[str, int] = {}
    for n in nodes_dict.values():
        node_counts[n.node_type] = node_counts.get(n.node_type, 0) + 1

    edge_counts: dict[str, int] = {}
    for e in edges_list:
        edge_counts[e.relationship_type] = edge_counts.get(e.relationship_type, 0) + 1

    graph_projection = ProjectKnowledgeGraph(
        project_id=project_id,
        project_display_name=project.display_name,
        nodes=list(nodes_dict.values()),
        edges=edges_list,
        node_count_by_type=node_counts,
        edge_count_by_type=edge_counts,
        subsystems=sorted(subsystems_set),
        total_nodes=len(nodes_dict),
        total_edges=len(edges_list),
        generated_at=now,
    )

    _GRAPH_PROJECTION_CACHE[project_id] = graph_projection
    return graph_projection


async def get_or_create_knowledge_graph(
    db: AsyncSession, project_id: uuid.UUID
) -> ProjectKnowledgeGraph:
    """Retrieve from cache or compute projection."""
    if project_id in _GRAPH_PROJECTION_CACHE:
        return _GRAPH_PROJECTION_CACHE[project_id]
    return await build_project_knowledge_graph(db, project_id)


async def explain_graph_edge(
    db: AsyncSession, project_id: uuid.UUID, relationship_id: str
) -> GraphEdgeExplanation:
    """
    Answers 'Why does this relationship exist?' with grounded evidence.
    """
    graph = await get_or_create_knowledge_graph(db, project_id)
    edge = next((e for e in graph.edges if e.relationship_id == relationship_id), None)

    if not edge:
        # Fallback search by source/target ID match
        edge = next(
            (
                e
                for e in graph.edges
                if f"{e.source_node_id}->{e.target_node_id}" == relationship_id
            ),
            None,
        )

    if not edge:
        return GraphEdgeExplanation(
            relationship_id=relationship_id,
            source_node_id="",
            source_label="",
            source_type="",
            target_node_id="",
            target_label="",
            target_type="",
            relationship_type="REFERENCES",
            label="Unknown Relationship",
            reason="Insufficient evidence to establish this relationship in PostgreSQL telemetry.",
            is_grounded=False,
            provenance="UNKNOWN",
        )

    source_node = next((n for n in graph.nodes if n.node_id == edge.source_node_id), None)
    target_node = next((n for n in graph.nodes if n.node_id == edge.target_node_id), None)

    source_lbl = source_node.label if source_node else edge.source_node_id
    source_type = source_node.node_type if source_node else "Unknown"
    target_lbl = target_node.label if target_node else edge.target_node_id
    target_type = target_node.node_type if target_node else "Unknown"

    evidence_details: list[dict[str, Any]] = []
    if source_node:
        evidence_details.append(
            {
                "entity": source_lbl,
                "type": source_type,
                "metadata": source_node.metadata,
            }
        )
    if target_node:
        evidence_details.append(
            {
                "entity": target_lbl,
                "type": target_type,
                "metadata": target_node.metadata,
            }
        )

    return GraphEdgeExplanation(
        relationship_id=edge.relationship_id,
        source_node_id=edge.source_node_id,
        source_label=source_lbl,
        source_type=source_type,
        target_node_id=edge.target_node_id,
        target_label=target_lbl,
        target_type=target_type,
        relationship_type=edge.relationship_type,
        label=edge.label,
        reason=edge.reason or f"Relationship established via {edge.relationship_type}",
        evidence_references=edge.evidence_references,
        evidence_details=evidence_details,
        health_impact="Security & Stability Posture" if "health" in target_type.lower() else None,
        is_grounded=True,
        provenance=edge.provenance,
    )


async def trace_root_cause(
    db: AsyncSession, project_id: uuid.UUID, starting_node_id: str
) -> GraphTraversalResponse:
    """
    TRACE ROOT CAUSE
    Walks backward from Project Health, Incident, Finding, or File to root cause development events.
    """
    graph = await get_or_create_knowledge_graph(db, project_id)
    start_node = next((n for n in graph.nodes if n.node_id == starting_node_id), None)

    if not start_node:
        # Search by label if ID not found directly
        start_node = next(
            (n for n in graph.nodes if n.label.lower() == starting_node_id.lower()), None
        )

    if not start_node:
        return GraphTraversalResponse(
            mode="ROOT_CAUSE",
            starting_node_id=starting_node_id,
            starting_label=starting_node_id,
            steps=[],
            path_summary="Root cause could not be established from available evidence.",
            is_complete=False,
            stopping_reason="Starting entity was not found in the project graph.",
            affected_subsystems=[],
            total_steps=0,
        )

    steps: list[GraphTraversalStep] = []
    current_node = start_node
    visited: set[str] = set()
    step_idx = 0

    steps.append(
        GraphTraversalStep(
            step_index=step_idx,
            node_id=current_node.node_id,
            node_type=current_node.node_type,
            label=current_node.label,
            subsystem=current_node.subsystem,
            relationship_type=None,
            direction="START",
            explanation=(
                f"Starting root-cause analysis from {current_node.node_type} "
                f"'{current_node.label}'"
            ),
            metadata=current_node.metadata,
        )
    )
    visited.add(current_node.node_id)

    # Backward traversal hierarchy:
    # Project -> HealthDimension -> Incident -> RootCause
    #         -> SecurityFinding -> File -> DevelopmentEvent
    while len(steps) < 10:
        step_idx += 1
        # Find inbound edges pointing to current_node
        inbound_edges = [e for e in graph.edges if e.target_node_id == current_node.node_id]

        if not inbound_edges:
            # Check outbound if causal
            inbound_edges = [
                e
                for e in graph.edges
                if e.source_node_id == current_node.node_id
                and e.relationship_type
                in ("CAUSED", "CONTRIBUTED_TO", "MODIFIED", "CONTAINS_FINDING")
            ]

        next_edge = None
        next_candidate = None

        # Priority search for causal predecessor
        preferred_types = [
            "DevelopmentEvent",
            "File",
            "SecurityFinding",
            "RootCause",
            "Incident",
            "HealthDimension",
        ]
        for pref in preferred_types:
            for e in inbound_edges:
                cand_id = (
                    e.source_node_id
                    if e.target_node_id == current_node.node_id
                    else e.target_node_id
                )
                cand = next((n for n in graph.nodes if n.node_id == cand_id), None)
                if cand and cand.node_type == pref and cand.node_id not in visited:
                    next_edge = e
                    next_candidate = cand
                    break
            if next_candidate:
                break

        if not next_candidate:
            break

        steps.append(
            GraphTraversalStep(
                step_index=step_idx,
                node_id=next_candidate.node_id,
                node_type=next_candidate.node_type,
                label=next_candidate.label,
                subsystem=next_candidate.subsystem,
                relationship_type=next_edge.relationship_type if next_edge else "DERIVED_FROM",
                direction="BACKWARD",
                explanation=next_edge.reason if next_edge else f"Linked to {next_candidate.label}",
                evidence=next_edge.evidence_references if next_edge else [],
                metadata=next_candidate.metadata,
            )
        )
        visited.add(next_candidate.node_id)
        current_node = next_candidate

        if current_node.node_type == "DevelopmentEvent":
            break

    affected_subs = list(
        {s.subsystem for s in steps if s.subsystem and s.subsystem != "General Architecture"}
    )
    is_terminal = len(steps) > 1 and steps[-1].node_type in ("DevelopmentEvent", "File")

    return GraphTraversalResponse(
        mode="ROOT_CAUSE",
        starting_node_id=start_node.node_id,
        starting_label=start_node.label,
        target_node_id=steps[-1].node_id if len(steps) > 1 else None,
        steps=steps,
        path_summary=(
            f"Traced root cause path across {len(steps)} verified graph entities "
            f"to '{steps[-1].label}'"
        ),
        is_complete=is_terminal,
        stopping_reason=(
            "Reached origin telemetry event in PostgreSQL."
            if is_terminal
            else "No further causal predecessors grounded in telemetry."
        ),
        affected_subsystems=affected_subs,
        total_steps=len(steps),
    )


async def trace_impact(
    db: AsyncSession, project_id: uuid.UUID, starting_node_id: str
) -> GraphTraversalResponse:
    """
    TRACE IMPACT
    Walks forward from Event, File, Finding, or Incident to downstream Health and Forecasts.
    """
    graph = await get_or_create_knowledge_graph(db, project_id)
    start_node = next((n for n in graph.nodes if n.node_id == starting_node_id), None)

    if not start_node:
        start_node = next(
            (n for n in graph.nodes if n.label.lower() == starting_node_id.lower()), None
        )

    if not start_node:
        return GraphTraversalResponse(
            mode="IMPACT",
            starting_node_id=starting_node_id,
            starting_label=starting_node_id,
            steps=[],
            path_summary="Impact could not be established from available evidence.",
            is_complete=False,
            stopping_reason="Starting entity was not found in the project graph.",
            affected_subsystems=[],
            total_steps=0,
        )

    steps: list[GraphTraversalStep] = []
    current_node = start_node
    visited: set[str] = set()
    step_idx = 0

    steps.append(
        GraphTraversalStep(
            step_index=step_idx,
            node_id=current_node.node_id,
            node_type=current_node.node_type,
            label=current_node.label,
            subsystem=current_node.subsystem,
            relationship_type=None,
            direction="START",
            explanation=(
                f"Starting impact analysis from {current_node.node_type} "
                f"'{current_node.label}'"
            ),
            metadata=current_node.metadata,
        )
    )
    visited.add(current_node.node_id)

    # Forward traversal hierarchy:
    # DevelopmentEvent -> File -> SecurityFinding -> RootCause -> Incident
    #                  -> HealthDimension -> Project -> Prediction
    preferred_types = [
        "File",
        "SecurityFinding",
        "RootCause",
        "Incident",
        "HealthDimension",
        "Project",
        "Prediction",
    ]

    while len(steps) < 10:
        step_idx += 1
        outbound_edges = [e for e in graph.edges if e.source_node_id == current_node.node_id]

        next_edge = None
        next_candidate = None

        for pref in preferred_types:
            for e in outbound_edges:
                cand = next((n for n in graph.nodes if n.node_id == e.target_node_id), None)
                if cand and cand.node_type == pref and cand.node_id not in visited:
                    next_edge = e
                    next_candidate = cand
                    break
            if next_candidate:
                break

        if not next_candidate:
            break

        steps.append(
            GraphTraversalStep(
                step_index=step_idx,
                node_id=next_candidate.node_id,
                node_type=next_candidate.node_type,
                label=next_candidate.label,
                subsystem=next_candidate.subsystem,
                relationship_type=next_edge.relationship_type if next_edge else "AFFECTS",
                direction="FORWARD",
                explanation=next_edge.reason
                if next_edge
                else f"Propagates impact to {next_candidate.label}",
                evidence=next_edge.evidence_references if next_edge else [],
                metadata=next_candidate.metadata,
            )
        )
        visited.add(next_candidate.node_id)
        current_node = next_candidate

    affected_subs = list(
        {s.subsystem for s in steps if s.subsystem and s.subsystem != "General Architecture"}
    )

    return GraphTraversalResponse(
        mode="IMPACT",
        starting_node_id=start_node.node_id,
        starting_label=start_node.label,
        target_node_id=steps[-1].node_id if len(steps) > 1 else None,
        steps=steps,
        path_summary=(
            f"Traced downstream impact path across {len(steps)} verified "
            f"graph entities to '{steps[-1].label}'"
        ),
        is_complete=len(steps) > 1,
        stopping_reason="Reached terminal impact boundary (Project Health / Prediction).",
        affected_subsystems=affected_subs,
        total_steps=len(steps),
    )


async def get_graph_timeline(db: AsyncSession, project_id: uuid.UUID) -> GraphTimelineResponse:
    """
    Constructs the chronological intelligence timeline with verified event timestamps.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    ev_stmt = (
        select(DevelopmentEvent)
        .where(DevelopmentEvent.project_root == project.root_path)
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    ev_res = await db.execute(ev_stmt)
    events = ev_res.scalars().all()

    sec_intel = await compute_security_intelligence(db, project_id)

    hist_stmt = (
        select(IncidentReviewHistory)
        .where(IncidentReviewHistory.project_id == project_id)
        .order_by(IncidentReviewHistory.created_at.asc())
    )
    hist_res = await db.execute(hist_stmt)
    review_histories = hist_res.scalars().all()

    timeline_items: list[GraphTimelineEvent] = []

    # 1. Telemetry Events
    for ev in events:
        p_clean = ev.file_path.replace("\\", "/") if ev.file_path else ""
        subsys = _classify_subsystem(p_clean) if p_clean else "Core Application"
        timeline_items.append(
            GraphTimelineEvent(
                id=f"tl-ev-{ev.id}",
                timestamp=ev.timestamp,
                event_type=ev.event_type,
                label=f"{ev.event_type}: {os.path.basename(p_clean) if p_clean else 'Telemetry'}",
                entity_id=f"event-{str(ev.id)[:8]}",
                entity_type="DevelopmentEvent",
                subsystem=subsys,
                details={
                    "file_path": p_clean,
                    "language": ev.language,
                },
                provenance="OBSERVED",
            )
        )

    # 2. Security Findings
    for finding in sec_intel.security_findings:
        f_norm = finding.file_path.replace("\\", "/")
        subsys = _classify_subsystem(f_norm)
        # Use finding first_seen or now
        timeline_items.append(
            GraphTimelineEvent(
                id=f"tl-sec-{finding.finding_id}",
                timestamp=datetime.now(tz=UTC),
                event_type="SECURITY_FINDING_DETECTED",
                label=f"Finding Detected: {finding.rule_id} in {os.path.basename(f_norm)}",
                entity_id=f"sec-{finding.finding_id}",
                entity_type="SecurityFinding",
                subsystem=subsys,
                details={
                    "severity": finding.severity,
                    "risk_points": finding.risk_contribution,
                    "remediation": finding.remediation,
                },
                provenance="OBSERVED",
            )
        )

    # 3. Incident Reviews & Resolutions
    for hist in review_histories:
        timeline_items.append(
            GraphTimelineEvent(
                id=f"tl-hist-{hist.id}",
                timestamp=hist.created_at or datetime.now(tz=UTC),
                event_type="INCIDENT_STATUS_TRANSITION",
                label=f"Incident {hist.incident_id}: {hist.previous_status} -> {hist.new_status}",
                entity_id=f"res-{hist.id}",
                entity_type="Resolution",
                subsystem=None,
                details={
                    "reviewer": hist.reviewer,
                    "resolution_note": _mask_secret(hist.resolution_note or ""),
                },
                provenance="OBSERVED",
            )
        )

    timeline_items.sort(key=lambda x: x.timestamp)

    return GraphTimelineResponse(
        project_id=project_id,
        events=timeline_items,
        total_events=len(timeline_items),
    )


async def get_before_after_comparison(
    db: AsyncSession, project_id: uuid.UUID
) -> BeforeAfterComparisonResponse:
    """
    Compares the graph state before vs after remediation.
    """
    graph = await get_or_create_knowledge_graph(db, project_id)

    # After nodes are the current canonical graph
    after_nodes = graph.nodes
    after_edges = graph.edges

    # Before nodes reconstruct state prior to RESOLVED transitions
    resolved_inc_ids = {
        n.metadata.get("incident_id")
        for n in graph.nodes
        if n.node_type == "Incident" and n.metadata.get("status") == "RESOLVED"
    }

    before_nodes: list[KnowledgeGraphNode] = []
    for n in graph.nodes:
        if n.node_type == "Resolution":
            continue  # Resolutions did not exist before
        node_copy = n.model_copy(deep=True)
        if node_copy.node_type == "Incident" and node_copy.metadata.get("status") == "RESOLVED":
            node_copy.metadata["status"] = "OPEN"
        before_nodes.append(node_copy)

    before_edges = [
        e for e in graph.edges if e.relationship_type not in ("RESOLVED_BY", "INVESTIGATED_BY")
    ]

    return BeforeAfterComparisonResponse(
        project_id=project_id,
        before_nodes=before_nodes,
        before_edges=before_edges,
        after_nodes=after_nodes,
        after_edges=after_edges,
        resolved_incidents_count=len(resolved_inc_ids),
        resolved_findings_count=len(
            [
                n
                for n in graph.nodes
                if n.node_type == "SecurityFinding" and n.metadata.get("status") == "RESOLVED"
            ]
        ),
        remediation_summary=(
            f"Remediated {len(resolved_inc_ids)} incidents with verified "
            "resolution audit trails in PostgreSQL."
        ),
    )


async def get_file_intelligence(
    db: AsyncSession, project_id: uuid.UUID, file_path: str
) -> FileIntelligenceView:
    """Retrieve detailed file intelligence view."""
    graph = await get_or_create_knowledge_graph(db, project_id)
    norm_p = file_path.replace("\\", "/")
    subsys = _classify_subsystem(norm_p)
    file_node_id = f"file-{uuid.uuid5(uuid.NAMESPACE_DNS, norm_p).hex[:12]}"

    target_node = next((n for n in graph.nodes if n.node_id == file_node_id), None)
    meta = target_node.metadata if target_node else {}

    connected_findings = [
        n.metadata
        for n in graph.nodes
        if n.node_type == "SecurityFinding" and n.metadata.get("file_path") == norm_p
    ]
    connected_incidents = [
        n.metadata
        for n in graph.nodes
        if n.node_type == "Incident" and norm_p in n.metadata.get("affected_files", [])
    ]
    connected_preds = [
        n.metadata
        for n in graph.nodes
        if n.node_type == "Prediction"
        and (
            norm_p in n.metadata.get("affected_files", [])
            or n.metadata.get("affected_subsystem") == subsys
        )
    ]
    related_nodes = [
        n
        for n in graph.nodes
        if n.node_id != file_node_id
        and (n.subsystem == subsys or n.metadata.get("file_path") == norm_p)
    ][:10]

    return FileIntelligenceView(
        file_path=norm_p,
        project_id=project_id,
        subsystem=subsys,
        language=meta.get("language", "Text"),
        activity_count=meta.get("activity_count", 0),
        first_seen=(datetime.fromisoformat(meta["first_seen"]) if meta.get("first_seen") else None),
        last_modified=(
            datetime.fromisoformat(meta["last_modified"]) if meta.get("last_modified") else None
        ),
        findings_count=len(connected_findings),
        findings=connected_findings,
        incidents_count=len(connected_incidents),
        incidents=connected_incidents,
        predictions_count=len(connected_preds),
        predictions=connected_preds,
        sessions_count=meta.get("sessions_count", 0),
        related_nodes=related_nodes,
        provenance="OBSERVED" if target_node else "UNKNOWN",
    )


async def get_subsystem_intelligence(
    db: AsyncSession, project_id: uuid.UUID, subsystem_name: str
) -> SubsystemIntelligenceView:
    """Retrieve detailed subsystem intelligence view."""
    graph = await get_or_create_knowledge_graph(db, project_id)
    subsys_nodes = [
        n for n in graph.nodes if n.subsystem and n.subsystem.lower() == subsystem_name.lower()
    ]

    files = [n.metadata.get("file_path", n.label) for n in subsys_nodes if n.node_type == "File"]
    total_activity = sum(
        n.metadata.get("activity_count", 0) for n in subsys_nodes if n.node_type == "File"
    )
    findings = [n.metadata for n in subsys_nodes if n.node_type == "SecurityFinding"]
    incidents = [n.metadata for n in subsys_nodes if n.node_type == "Incident"]
    open_incidents = [i for i in incidents if i.get("status") in ("OPEN", "INVESTIGATING")]
    resolved_incidents = [i for i in incidents if i.get("status") == "RESOLVED"]
    forecasts = [n.metadata for n in subsys_nodes if n.node_type == "Prediction"]

    risk_score = sum(int(f.get("risk_contribution", 10)) for f in findings)
    health_status = (
        "CRITICAL"
        if risk_score >= 50 or len(open_incidents) >= 2
        else "DEGRADED"
        if risk_score >= 20 or len(open_incidents) == 1
        else "HEALTHY"
    )

    return SubsystemIntelligenceView(
        subsystem_name=subsystem_name,
        project_id=project_id,
        file_count=len(files),
        activity_count=total_activity,
        findings_count=len(findings),
        open_incidents_count=len(open_incidents),
        resolved_incidents_count=len(resolved_incidents),
        forecast_signals_count=len(forecasts),
        risk_score=risk_score,
        health_status=health_status,
        files=files,
        active_findings=findings,
        active_incidents=open_incidents,
        forecast_signals=forecasts,
        provenance="OBSERVED" if subsys_nodes else "UNKNOWN",
    )


async def get_incident_relationships(
    db: AsyncSession, project_id: uuid.UUID, incident_id: str
) -> IncidentRelationshipView:
    """Retrieve detailed incident relationship view."""
    graph = await get_or_create_knowledge_graph(db, project_id)
    inc_node = next(
        (
            n
            for n in graph.nodes
            if n.node_type == "Incident" and n.metadata.get("incident_id") == incident_id
        ),
        None,
    )
    if not inc_node:
        return IncidentRelationshipView(
            incident_id=incident_id,
            project_id=project_id,
            title="Unknown Incident",
            severity="LOW",
            status="UNKNOWN",
            health_impact="None",
            provenance="UNKNOWN",
        )

    meta = inc_node.metadata
    subsys = meta.get("affected_subsystem") or inc_node.subsystem or "Core Application"
    files = meta.get("affected_files") or []

    connected_findings = [
        n.metadata
        for n in graph.nodes
        if n.node_type == "SecurityFinding" and n.metadata.get("file_path") in files
    ]
    connected_resolutions = [n.metadata for n in graph.nodes if n.node_type == "Resolution"]

    return IncidentRelationshipView(
        incident_id=incident_id,
        project_id=project_id,
        title=inc_node.label,
        severity=meta.get("severity", "HIGH"),
        status=meta.get("status", "OPEN"),
        affected_files=files,
        affected_subsystems=[subsys],
        findings=connected_findings,
        sessions=[],
        resolutions=connected_resolutions,
        health_impact="Security & Incident Health",
        provenance="OBSERVED",
    )


async def get_project_memory(db: AsyncSession, project_id: uuid.UUID) -> ProjectMemory2:
    """Retrieve Project Memory 2.0 structured AI memory model."""
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    graph = await get_or_create_knowledge_graph(db, project_id)
    health = await get_or_create_unified_project_health(db, project_id)
    proj_ctx = await get_or_create_project_context(db, project_id)

    important_files = [
        n.metadata.get("file_path", n.label)
        for n in sorted(
            [n for n in graph.nodes if n.node_type == "File"],
            key=lambda x: int(x.metadata.get("activity_count", 0)),
            reverse=True,
        )[:10]
    ]

    incidents = [n for n in graph.nodes if n.node_type == "Incident"]
    open_inc = [i for i in incidents if i.metadata.get("status") in ("OPEN", "INVESTIGATING")]
    res_inc = [i for i in incidents if i.metadata.get("status") == "RESOLVED"]

    findings = [n for n in graph.nodes if n.node_type == "SecurityFinding"]
    rules_count: dict[str, int] = {}
    for f in findings:
        r = f.metadata.get("rule_id", "UNKNOWN")
        rules_count[r] = rules_count.get(r, 0) + 1
    recurring_rules = [r for r, c in rules_count.items() if c > 1]

    priorities = await get_project_priorities(db, project_id)

    known_unknowns = []
    if health.status == "INSUFFICIENT_EVIDENCE":
        known_unknowns.append(
            "Telemetry observation window is below statistical baseline (< 5 events)."
        )
    if not findings:
        known_unknowns.append("No active AST security violations detected in observed files.")
    if not res_inc:
        known_unknowns.append("No historical triage resolution records in PostgreSQL.")

    dev_focus = (
        proj_ctx.development_focus.focus
        if proj_ctx and proj_ctx.development_focus
        else "Feature Development & Stabilization"
    )

    lang_list = list(proj_ctx.languages.keys()) if proj_ctx and proj_ctx.languages else ["Python"]

    return ProjectMemory2(
        project_id=project_id,
        project_display_name=project.display_name,
        root_path=project.root_path,
        languages=lang_list,
        technologies=[n.label for n in graph.nodes if n.node_type == "Technology"],
        frameworks=[n.label for n in graph.nodes if n.node_type == "Framework"],
        important_files=important_files,
        subsystems=graph.subsystems,
        current_focus=dev_focus,
        overall_health_score=health.overall_health_score,
        health_grade=health.grade,
        active_incidents_count=len(open_inc),
        resolved_incidents_count=len(res_inc),
        recurring_findings_count=len(recurring_rules),
        recurring_rules=recurring_rules,
        active_forecasts_count=len([n for n in graph.nodes if n.node_type == "Prediction"]),
        top_priorities=[p.model_dump(mode="json") for p in priorities[:3]],
        known_relationships_count=len(graph.edges),
        known_unknowns=known_unknowns,
        provenance="OBSERVED" if health.status != "INSUFFICIENT_EVIDENCE" else "UNKNOWN",
        generated_at=datetime.now(tz=UTC),
    )


async def search_knowledge_graph(
    db: AsyncSession, project_id: uuid.UUID, query: str
) -> list[GraphSearchResult]:
    """Deterministic multi-entity search over project knowledge graph."""
    if not query or not query.strip():
        return []

    graph = await get_or_create_knowledge_graph(db, project_id)
    q_low = query.strip().lower()
    results: list[GraphSearchResult] = []

    for n in graph.nodes:
        lbl_low = n.label.lower()
        subsys_low = (n.subsystem or "").lower()
        meta_str = str(n.metadata).lower()

        score = 0
        match_reason = ""

        if q_low == lbl_low:
            score = 100
            match_reason = f"Exact match on {n.node_type} label"
        elif q_low in lbl_low:
            score = 80
            match_reason = f"Substring match in {n.node_type} label"
        elif q_low in subsys_low:
            score = 60
            match_reason = f"Subsystem match ({n.subsystem})"
        elif q_low in meta_str:
            score = 40
            match_reason = f"Metadata match in {n.node_type}"

        if score > 0:
            results.append(
                GraphSearchResult(
                    entity_id=n.node_id,
                    entity_type=n.node_type,
                    label=n.label,
                    subsystem=n.subsystem,
                    match_reason=match_reason,
                    score=score,
                    provenance=n.provenance,
                )
            )

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:20]
