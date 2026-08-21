"""
Security Incident Correlator.

Correlates individual development events, file modifications, and security findings
occurring within temporal correlation windows (e.g. 15 minutes) into cohesive
Correlated Security Incidents.
"""

from __future__ import annotations

import os
import uuid
from datetime import timedelta

from app.core.domain.events import AnalyzableEvent
from app.features.security_intelligence.schemas import (
    CorrelatedSecurityIncident,
    RiskScoreBreakdownItem,
    RiskScoreExplanation,
    SecurityFinding,
)


def correlate_security_incidents(
    events: list[AnalyzableEvent],
    findings: list[SecurityFinding],
    correlation_window_minutes: int = 15,
) -> list[CorrelatedSecurityIncident]:
    """
    Groups security-relevant events and findings by session and temporal proximity
    into unified security incidents.
    """
    if not findings and not events:
        return []

    # Map findings by file and approximate timestamp
    findings_by_file: dict[str, list[SecurityFinding]] = {}
    for f in findings:
        norm_f = f.file_path.replace("\\", "/").lower()
        base_f = os.path.basename(norm_f)
        findings_by_file.setdefault(norm_f, []).append(f)
        if base_f != norm_f:
            findings_by_file.setdefault(base_f, []).append(f)

    # Filter events that are security-relevant
    sec_events: list[AnalyzableEvent] = []
    for ev in events:
        f_low = (ev.file_path or "").replace("\\", "/").lower()
        if (
            any(
                k in f_low
                for k in (
                    "auth",
                    "security",
                    "secret",
                    ".env",
                    "config",
                    "settings",
                    "password",
                    "token",
                    "key",
                )
            )
            or f_low in findings_by_file
            or os.path.basename(f_low) in findings_by_file
        ):
            sec_events.append(ev)

    # If no security events, create standalone incidents from findings
    if not sec_events and findings:
        incidents: list[CorrelatedSecurityIncident] = []
        for f in findings:
            incidents.append(
                CorrelatedSecurityIncident(
                    incident_id=uuid.uuid4().hex[:12],
                    title=f"Security Alert: {f.title}",
                    severity=f.severity,
                    risk_score=f.risk_contribution,
                    session_id=f.project_id,
                    affected_files=[f.file_path],
                    event_count=1,
                    first_event_at=f.detected_at,
                    latest_event_at=f.detected_at,
                    contributing_findings=[f],
                    evidence_summary=[f.redacted_evidence],
                )
            )
        return incidents

    # Group events by session_id and temporal clusters
    clusters: list[list[AnalyzableEvent]] = []
    sorted_events = sorted(sec_events, key=lambda e: e.timestamp.timestamp() if e.timestamp else 0)

    current_cluster: list[AnalyzableEvent] = []
    window = timedelta(minutes=correlation_window_minutes)

    for ev in sorted_events:
        if not current_cluster:
            current_cluster.append(ev)
            continue

        prev_ev = current_cluster[-1]
        time_diff = (
            (ev.timestamp - prev_ev.timestamp)
            if (ev.timestamp and prev_ev.timestamp)
            else timedelta(0)
        )

        if ev.session_id == prev_ev.session_id and time_diff <= window:
            current_cluster.append(ev)
        else:
            clusters.append(current_cluster)
            current_cluster = [ev]

    if current_cluster:
        clusters.append(current_cluster)

    incidents: list[CorrelatedSecurityIncident] = []

    for cluster in clusters:
        affected_files: set[str] = set()
        matched_findings: list[SecurityFinding] = []
        evidence_summary: list[str] = []

        first_ts = cluster[0].timestamp
        latest_ts = cluster[-1].timestamp

        has_critical = False
        has_high = False
        has_medium = False
        has_auth_change = False
        has_config_change = False

        for ev in cluster:
            if ev.file_path:
                norm_p = ev.file_path.replace("\\", "/")
                affected_files.add(norm_p)
                p_low = norm_p.lower()
                if "auth" in p_low or "security" in p_low:
                    has_auth_change = True
                if "config" in p_low or ".env" in p_low or "settings" in p_low:
                    has_config_change = True

                # Attach matching findings
                for f_cand in findings:
                    f_p = f_cand.file_path.replace("\\", "/").lower()
                    if f_p == norm_p.lower() or os.path.basename(f_p) == os.path.basename(
                        norm_p.lower()
                    ):
                        if f_cand not in matched_findings:
                            matched_findings.append(f_cand)
                            evidence_summary.append(
                                f"{f_cand.title} in {os.path.basename(f_cand.file_path)}"
                            )

        # Calculate incident risk score additively
        score = 0
        if matched_findings:
            for f in matched_findings:
                score += f.risk_contribution
                if f.severity == "CRITICAL":
                    has_critical = True
                elif f.severity == "HIGH":
                    has_high = True
                elif f.severity == "MEDIUM":
                    has_medium = True
        else:
            if has_auth_change:
                score += 15
            if has_config_change:
                score += 20
            if len(cluster) > 3:
                score += 10

        score = min(score, 100)

        # Determine incident severity
        if has_critical or score >= 80:
            severity = "CRITICAL"
        elif has_high or score >= 60:
            severity = "HIGH"
        elif has_medium or score >= 30:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # Determine incident title
        if matched_findings:
            top_finding = matched_findings[0]
            title = f"{top_finding.title} ({len(cluster)} correlated events)"
        elif has_auth_change and has_config_change:
            title = f"Authentication & Configuration modification ({len(affected_files)} files)"
        elif has_auth_change:
            title = f"Authentication subsystem modification ({len(cluster)} events)"
        elif has_config_change:
            title = f"Sensitive configuration changes ({len(affected_files)} files)"
        else:
            title = f"Security-relevant development burst ({len(cluster)} events)"

        incidents.append(
            CorrelatedSecurityIncident(
                incident_id=uuid.uuid4().hex[:12],
                title=title,
                severity=severity,
                risk_score=score,
                session_id=cluster[0].session_id,
                affected_files=sorted(affected_files),
                event_count=len(cluster),
                first_event_at=first_ts,
                latest_event_at=latest_ts,
                contributing_findings=matched_findings,
                evidence_summary=evidence_summary
                if evidence_summary
                else [f"{len(cluster)} events across {len(affected_files)} files"],
            )
        )

    # Sort incidents: CRITICAL -> HIGH -> MEDIUM -> LOW, then newest first
    sev_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    incidents.sort(
        key=lambda inc: (
            sev_order.get(inc.severity, 4),
            -inc.risk_score,
            -inc.latest_event_at.timestamp(),
        )
    )

    return incidents


def compute_risk_explanation(
    findings: list[SecurityFinding],
    sensitive_files_count: int,
    auth_changes_count: int,
    config_changes_count: int,
    burst_detected: bool = False,
) -> RiskScoreExplanation:
    """
    Computes an explainable additive risk score (0-100) with full breakdown visibility.
    """
    score = 0
    breakdown: list[RiskScoreBreakdownItem] = []

    # 1. Credential & secret exposures
    cred_findings = [f for f in findings if f.category == "Secrets" or f.rule_id == "SEC001"]
    if cred_findings:
        pts = min(len(cred_findings) * 50, 50)
        score += pts
        breakdown.append(
            RiskScoreBreakdownItem(
                factor=f"Credential exposure detected ({len(cred_findings)} occurrences)",
                points=pts,
                category="Credentials",
            )
        )

    # 2. Dangerous code execution (eval, exec, subprocess, pickle)
    exec_findings = [
        f for f in findings if f.category in ("Dangerous Execution", "Deserialization", "Injection")
    ]
    if exec_findings:
        pts = min(len(exec_findings) * 25, 35)
        score += pts
        breakdown.append(
            RiskScoreBreakdownItem(
                factor=f"Dangerous dynamic execution patterns ({len(exec_findings)} findings)",
                points=pts,
                category="Dangerous Code",
            )
        )

    # 3. Insecure configuration & network
    config_findings = [
        f for f in findings if f.category in ("Configuration Risk", "Network & Transport")
    ]
    if config_findings:
        pts = min(len(config_findings) * 15, 20)
        score += pts
        breakdown.append(
            RiskScoreBreakdownItem(
                factor=f"Insecure config/transport settings ({len(config_findings)} findings)",
                points=pts,
                category="Configuration",
            )
        )

    # 4. Authentication modifications
    if auth_changes_count > 0:
        pts = min(auth_changes_count * 5, 15)
        score += pts
        breakdown.append(
            RiskScoreBreakdownItem(
                factor=f"Active modifications to auth subsystems ({auth_changes_count} events)",
                points=pts,
                category="Authentication",
            )
        )

    # 5. Sensitive file modifications
    if config_changes_count > 0:
        pts = min(config_changes_count * 3, 10)
        score += pts
        breakdown.append(
            RiskScoreBreakdownItem(
                factor=f"Modifications to sensitive config files ({config_changes_count} events)",
                points=pts,
                category="Sensitive Files",
            )
        )

    # 6. Burst activity on security targets
    if burst_detected:
        score += 7
        breakdown.append(
            RiskScoreBreakdownItem(
                factor="High frequency modification burst on security-sensitive files",
                points=7,
                category="Activity Pattern",
            )
        )

    score = min(score, 100)

    if score >= 80:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return RiskScoreExplanation(
        total_score=score,
        risk_level=level,
        breakdown=breakdown,
    )
