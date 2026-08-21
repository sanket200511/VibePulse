"""
Investigation Service.
Coordinates AST parsing, repository execution, explainable risk scoring,
evidence graph synthesis, and canonical mapping.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.investigation.domain import parse_investigation_query
from app.features.investigation.repository import execute_investigation_query
from app.features.investigation.schemas import (
    EvidenceNode,
    EvidenceStep,
    InvestigationAIEvent,
    InvestigationArchitectureChange,
    InvestigationResponse,
    InvestigationResult,
    InvestigationSecurityFinding,
    RiskFactor,
)
from app.features.timeline.service import _fetch_analyses


def _compute_risk_and_evidence(
    event_type: str,
    file_path: str | None,
    timestamp: datetime,
    security_findings: list[InvestigationSecurityFinding],
    architecture_changes: list[InvestigationArchitectureChange],
) -> tuple[
    int,
    str,
    list[RiskFactor],
    list[EvidenceStep],
    list[EvidenceNode],
    list[str],
    str | None,
]:
    score = 0
    factors: list[RiskFactor] = []
    evidence_steps: list[EvidenceStep] = []
    evidence_nodes: list[EvidenceNode] = []
    affected_files: list[str] = []
    recommendation: str | None = None

    file_lower = (file_path or "").lower()
    file_name = os.path.basename(file_path or "") if file_path else "Source file"
    if file_path:
        affected_files.append(file_path)

    # Base Node 1: Session start / activity initialization
    t_start = timestamp - timedelta(seconds=15)
    evidence_nodes.append(
        EvidenceNode(
            id="node-session-start",
            step_number=1,
            title="Session Activity Initialized",
            subtitle="Developer activity observed by local daemon",
            kind="SESSION_START",
            timestamp=t_start,
            details={"source": "VibePulse Telemetry Daemon"},
        )
    )

    # Node 2: File Modification
    evidence_steps.append(
        EvidenceStep(
            timestamp=timestamp,
            title=f"{file_name} {event_type.replace('_', ' ').lower()}",
            description=f"File event observed on {file_path or 'unknown path'}",
            kind="FILE_CHANGE",
            file=file_path,
        )
    )
    evidence_nodes.append(
        EvidenceNode(
            id="node-file-change",
            step_number=2,
            title=f"{file_name} {event_type.replace('_', ' ').title()}",
            subtitle=f"Filesystem write captured on {file_name}",
            kind="FILE_CHANGE",
            timestamp=timestamp,
            file=file_path,
            details={"event_type": event_type, "file_path": file_path},
        )
    )

    # 1. Security findings contribution
    has_high_sec = False
    for finding in security_findings:
        sev = finding.severity.upper()
        if sev == "CRITICAL":
            score += 50
            has_high_sec = True
            factors.append(
                RiskFactor(
                    label=f"Critical credential exposure ({finding.rule_id})",
                    score=50,
                    category="Security",
                )
            )
            evidence_steps.append(
                EvidenceStep(
                    timestamp=timestamp,
                    title="Critical security finding detected",
                    description=(f"{finding.message} in {file_name}:{finding.line_number or 1}"),
                    kind="PATTERN_MATCH",
                    severity="CRITICAL",
                    file=file_path,
                )
            )
            evidence_nodes.append(
                EvidenceNode(
                    id="node-sec-pattern",
                    step_number=3,
                    title="Critical Secret Pattern Detected",
                    subtitle=f"{finding.rule_id or 'SEC001'}: {finding.message}",
                    kind="PATTERN_MATCH",
                    timestamp=timestamp,
                    severity="CRITICAL",
                    file=file_path,
                    details={
                        "rule_id": finding.rule_id or "SEC001",
                        "pattern": "API_KEY / Credentials",
                        "redacted_evidence": finding.redacted_evidence or "[REDACTED]",
                        "confidence": "CRITICAL",
                        "line_number": finding.line_number or 1,
                    },
                )
            )
            recommendation = (
                finding.recommendation
                or "Move hardcoded credentials to environment variables or secret store."
            )
        elif sev == "HIGH":
            score += 40
            has_high_sec = True
            factors.append(
                RiskFactor(
                    label=f"High risk security finding ({finding.rule_id})",
                    score=40,
                    category="Security",
                )
            )
            evidence_steps.append(
                EvidenceStep(
                    timestamp=timestamp,
                    title="High risk security pattern detected",
                    description=(f"{finding.message} in {file_name}:{finding.line_number or 1}"),
                    kind="PATTERN_MATCH",
                    severity="HIGH",
                    file=file_path,
                )
            )
            evidence_nodes.append(
                EvidenceNode(
                    id="node-sec-pattern",
                    step_number=3,
                    title="Security Pattern Detected",
                    subtitle=f"{finding.rule_id}: {finding.message}",
                    kind="PATTERN_MATCH",
                    timestamp=timestamp,
                    severity="HIGH",
                    file=file_path,
                    details={
                        "rule_id": finding.rule_id,
                        "redacted_evidence": finding.redacted_evidence or "[REDACTED]",
                        "line_number": finding.line_number or 1,
                    },
                )
            )
            recommendation = finding.recommendation or "Review and sanitize dangerous code pattern."
        elif sev == "MEDIUM":
            score += 25
            factors.append(
                RiskFactor(
                    label=f"Suspicious configuration or code pattern ({finding.rule_id})",
                    score=25,
                    category="Security",
                )
            )
        elif sev == "LOW":
            score += 10
            factors.append(
                RiskFactor(
                    label=f"Security code quality warning ({finding.rule_id})",
                    score=10,
                    category="Security",
                )
            )

    # 2. Configuration file modification
    if any(
        cfg in file_lower
        for cfg in (
            "config",
            "settings",
            ".env",
            "secrets",
            "database.py",
            "credentials",
        )
    ):
        score += 20
        factors.append(
            RiskFactor(
                label="Sensitive configuration file modified",
                score=20,
                category="Configuration",
            )
        )
        evidence_steps.append(
            EvidenceStep(
                timestamp=timestamp,
                title="Configuration file modified",
                description=f"Changes committed to sensitive config file ({file_name})",
                kind="CORRELATION",
                file=file_path,
            )
        )

    # 3. Authentication logic modification
    if any(
        auth_kw in file_lower for auth_kw in ("auth", "login", "token", "jwt", "session", "oauth")
    ):
        score += 15
        factors.append(
            RiskFactor(
                label="Authentication logic modified",
                score=15,
                category="Authentication",
            )
        )

    # 4. Architectural removals / refactors
    removed_changes = [
        c for c in architecture_changes if "REMOVED" in c.kind or "DELETED" in c.kind
    ]
    if removed_changes:
        score += 10
        factors.append(
            RiskFactor(
                label=f"Code deletion / refactor ({len(removed_changes)} symbols)",
                score=10,
                category="Architecture",
            )
        )

    # 5. Baseline for routine events
    if not factors:
        score = 10
        factors.append(
            RiskFactor(
                label="Routine development observation",
                score=10,
                category="General",
            )
        )

    score = min(score, 100)

    # Risk level determination
    if score >= 80:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    # Escalation node in evidence graph
    if has_high_sec or score >= 60:
        evidence_steps.append(
            EvidenceStep(
                timestamp=timestamp + timedelta(seconds=1),
                title=f"Risk escalated to {level}",
                description=(
                    f"Composite risk evaluated at {score}/100 based on "
                    f"{len(factors)} contributing signals"
                ),
                kind="RISK_ESCALATION",
                severity=level,
            )
        )
        evidence_nodes.append(
            EvidenceNode(
                id="node-risk-escalation",
                step_number=len(evidence_nodes) + 1,
                title=f"Risk Escalated to {level}",
                subtitle=f"Risk Score evaluated at {score}/100 from {len(factors)} signals",
                kind="RISK_ESCALATION",
                timestamp=timestamp + timedelta(seconds=1),
                severity=level,
                details={
                    "risk_score": score,
                    "risk_level": level,
                    "contributing_factors": len(factors),
                },
            )
        )

    # Final Node: Investigation Created
    evidence_nodes.append(
        EvidenceNode(
            id="node-investigation-created",
            step_number=len(evidence_nodes) + 1,
            title="Investigation Incident Logged",
            subtitle="Correlated incident ready for developer review and remediation",
            kind="INVESTIGATION_CREATED",
            timestamp=timestamp + timedelta(seconds=2),
            details={"status": "ACTIVE_INVESTIGATION"},
        )
    )

    return (
        score,
        level,
        factors,
        evidence_steps,
        evidence_nodes,
        affected_files,
        recommendation,
    )


async def search_investigation(
    db: AsyncSession,
    query_string: str,
    project_id: uuid.UUID | None = None,
    session_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> InvestigationResponse:
    # 1. Parse AST
    query = parse_investigation_query(query_string)

    # 2. Fetch Raw Deterministic Data
    events, total_count = await execute_investigation_query(
        db, query, project_id, session_id, limit, offset
    )

    if not events:
        return InvestigationResponse(
            results=[],
            total_count=0,
            suspicious_count=0,
            high_risk_count=0,
            sessions_count=0,
            projects_count=0,
            has_more=False,
        )

    # 3. Fetch Analyses for the matched events
    event_ids = [e.id for e in events]
    analyses = await _fetch_analyses(db, event_ids)

    # 4. Map to Canonical Result
    results: list[InvestigationResult] = []
    distinct_sessions: set[uuid.UUID] = set()
    distinct_projects: set[str] = set()
    suspicious_count = 0
    high_risk_count = 0
    critical_count = 0
    security_findings_count = 0

    for i, event in enumerate(events):
        distinct_sessions.add(event.session_id)
        if event.project_root:
            distinct_projects.add(event.project_root)

        event_analyses = analyses.get(event.id, {})

        # Populate architecture changes
        architecture_changes: list[InvestigationArchitectureChange] = []
        evo = event_analyses.get("code_evolution", {})
        for obs in evo.get("observations", []):
            architecture_changes.append(
                InvestigationArchitectureChange(
                    kind=obs.get("kind", ""),
                    symbol=obs.get("symbol", ""),
                )
            )

        # Populate security findings
        security_findings: list[InvestigationSecurityFinding] = []
        sec = event_analyses.get("security_guardian", {})
        for finding in sec.get("findings", []):
            msg = (
                finding.get("title")
                or finding.get("message")
                or finding.get("description")
                or "Hardcoded Secret Detected"
            )
            security_findings.append(
                InvestigationSecurityFinding(
                    rule_id=finding.get("rule_id", "SEC001"),
                    severity=finding.get("severity", "HIGH"),
                    message=msg,
                    file=finding.get("file") or event.file_path,
                    line_number=finding.get("line_number"),
                    redacted_evidence=finding.get("redacted_evidence") or finding.get("evidence"),
                    category=finding.get("category") or "Credentials",
                    recommendation=finding.get("remediation")
                    or "Move secret to environment/secret storage.",
                )
            )

        ai_event = None
        if event.event_type in (
            "AI_REQUEST_STARTED",
            "AI_RESPONSE_RECEIVED",
            "AI_TOOL_EXECUTED",
            "AI_COMPLETION_ACCEPTED",
        ):
            ai_event = InvestigationAIEvent(
                provider=event.event_metadata.get("provider", "Unknown"),
                model=event.event_metadata.get("model", "Unknown"),
                interaction_type=event.event_metadata.get("interaction_type"),
            )

        # Compute deterministic risk score, evidence chain, and evidence graph nodes
        (
            risk_score,
            risk_level,
            risk_factors,
            evidence_chain,
            evidence_nodes,
            affected_files,
            recommendation,
        ) = _compute_risk_and_evidence(
            event.event_type,
            event.file_path,
            event.timestamp,
            security_findings,
            architecture_changes,
        )

        if security_findings:
            security_findings_count += 1
        if risk_score >= 80 or risk_level == "CRITICAL":
            critical_count += 1
        if risk_score >= 60 or risk_level in ("HIGH", "CRITICAL"):
            high_risk_count += 1
        if risk_score >= 30 or security_findings:
            suspicious_count += 1

        project_name = os.path.basename(event.project_root) if event.project_root else "Project"
        summary = f"{event.event_type.replace('_', ' ').title()}"
        if event.file_name:
            summary += f" on {event.file_name}"
        if security_findings:
            summary = f"Security Alert: {security_findings[0].message}"

        results.append(
            InvestigationResult(
                id=event.id,
                timestamp=event.timestamp,
                project_root=event.project_root,
                project_name=project_name,
                session_id=event.session_id,
                file_path=event.file_path,
                file_name=event.file_name,
                language=event.language,
                event_type=event.event_type,
                summary=summary,
                risk_score=risk_score,
                risk_level=risk_level,
                risk_factors=risk_factors,
                evidence_chain=evidence_chain,
                evidence_nodes=evidence_nodes,
                affected_files=affected_files,
                correlated_events_count=len(evidence_nodes),
                recommendation=recommendation,
                architecture_changes=architecture_changes,
                security_findings=security_findings,
                ai_event=ai_event,
                replay_link=f"/sessions/{event.session_id}/replay?event={event.id}",
                timeline_position=i + offset,
            )
        )

    # Sort investigations: CRITICAL -> HIGH -> MEDIUM -> LOW,
    # and within the same severity level by newest timestamp first.
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    results.sort(
        key=lambda r: (
            severity_order.get(r.risk_level.upper(), 4),
            -r.timestamp.timestamp(),
        )
    )

    has_more = (offset + limit) < total_count

    return InvestigationResponse(
        results=results,
        total_count=total_count,
        security_findings_count=security_findings_count,
        critical_count=critical_count,
        suspicious_count=suspicious_count,
        high_risk_count=high_risk_count,
        sessions_count=len(distinct_sessions),
        projects_count=len(distinct_projects),
        has_more=has_more,
    )
