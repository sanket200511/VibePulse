"""
Investigation Service.
Coordinates the AST parsing, repository execution, explainable risk scoring, and canonical mapping.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.investigation.domain import parse_investigation_query
from app.features.investigation.repository import execute_investigation_query
from app.features.investigation.schemas import (
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
) -> tuple[int, str, list[RiskFactor], list[EvidenceStep], str | None]:
    score = 0
    factors: list[RiskFactor] = []
    evidence_steps: list[EvidenceStep] = []
    recommendation: str | None = None

    file_lower = (file_path or "").lower()
    file_name = os.path.basename(file_path or "") if file_path else "Source file"

    # Step 1: Initial file modification step
    evidence_steps.append(
        EvidenceStep(
            timestamp=timestamp,
            title=f"{file_name} {event_type.replace('_', ' ').lower()}",
            description=f"File event observed on {file_path or 'unknown path'}",
            kind="FILE_CHANGE",
            file=file_path,
        )
    )

    # 1. Security findings contribution
    has_high_sec = False
    for finding in security_findings:
        if finding.severity.upper() == "HIGH":
            score += 50
            has_high_sec = True
            factors.append(
                RiskFactor(
                    label="Hardcoded credential pattern detected (SEC001)",
                    score=50,
                    category="Security",
                )
            )
            evidence_steps.append(
                EvidenceStep(
                    timestamp=timestamp,
                    title="Suspicious credential pattern detected",
                    description=f"{finding.message} in {file_name}:{finding.line_number or 1}",
                    kind="PATTERN_MATCH",
                    severity="HIGH",
                    file=file_path,
                )
            )
            recommendation = (
                "Move hardcoded credentials and secret tokens to environment variables "
                "or a secrets manager (e.g. HashiCorp Vault, AWS Secrets Manager)."
            )
        elif finding.severity.upper() == "MEDIUM":
            score += 30
            factors.append(
                RiskFactor(
                    label="Suspicious code pattern detected",
                    score=30,
                    category="Security",
                )
            )
        elif finding.severity.upper() == "LOW":
            score += 15
            factors.append(
                RiskFactor(
                    label="Code quality / security warning",
                    score=15,
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
        auth_kw in file_lower
        for auth_kw in ("auth", "login", "token", "jwt", "session", "oauth")
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
        c
        for c in architecture_changes
        if "REMOVED" in c.kind or "DELETED" in c.kind
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

    # Final escalation step in evidence chain if risky
    if has_high_sec or score >= 60:
        evidence_steps.append(
            EvidenceStep(
                timestamp=timestamp,
                title=f"Risk escalated to {level}",
                description=(
                    f"Composite risk evaluated at {score}/100 based on "
                    f"{len(factors)} contributing signals"
                ),
                kind="RISK_ESCALATION",
                severity=level,
            )
        )

    return score, level, factors, evidence_steps, recommendation


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
        return InvestigationResponse(results=[], total_count=0, has_more=False)

    # 3. Fetch Analyses for the matched events
    event_ids = [e.id for e in events]
    analyses = await _fetch_analyses(db, event_ids)

    # 4. Map to Canonical Result
    results: list[InvestigationResult] = []

    for i, event in enumerate(events):
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
                    redacted_evidence=finding.get("redacted_evidence")
                    or finding.get("evidence"),
                    category=finding.get("category") or "Credentials",
                    recommendation="Move secret to environment/secret storage.",
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

        # Compute deterministic risk score and evidence chain
        (
            risk_score,
            risk_level,
            risk_factors,
            evidence_chain,
            recommendation,
        ) = _compute_risk_and_evidence(
            event.event_type,
            event.file_path,
            event.timestamp,
            security_findings,
            architecture_changes,
        )

        project_name = (
            os.path.basename(event.project_root)
            if event.project_root
            else "Project"
        )
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
                recommendation=recommendation,
                architecture_changes=architecture_changes,
                security_findings=security_findings,
                ai_event=ai_event,
                replay_link=f"/sessions/{event.session_id}/replay?event={event.id}",
                timeline_position=i + offset,
            )
        )

    has_more = (offset + limit) < total_count

    return InvestigationResponse(
        results=results,
        total_count=total_count,
        has_more=has_more,
    )
