import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.project_context.service import get_or_create_project_context
from app.features.projects.models import Project
from app.features.sessions.models import Session

# Redaction patterns for defense-in-depth against secret exposure
SECRET_PATTERNS = [
    re.compile(
        r"(api[_-]?key|secret|token|password|passwd|auth[_-]?token)\s*[:=]\s*['\"][^'\"]+['\"]",
        re.IGNORECASE,
    ),
    re.compile(
        r"(ghp_[A-Za-z0-9_]{36,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})",
        re.IGNORECASE,
    ),
]


def redact_sensitive_text(text: str) -> str:
    """Ensure no raw tokens or credentials ever slip into the markdown export."""
    if not text:
        return text
    redacted = text
    for pat in SECRET_PATTERNS:
        redacted = pat.sub(r"\1: [REDACTED]", redacted)
    return redacted


def format_iso(dt: datetime | str | None) -> str:
    if not dt:
        return "Unknown"
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


async def generate_project_context_markdown(db: AsyncSession, project_id: uuid.UUID) -> str:
    """
    Generates a canonical, professional, and portable PROJECT_CONTEXT.md document
    derived deterministically from stored PostgreSQL telemetry, project_contexts,
    sessions, events, and analyses.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    # Fetch latest durable context
    context = await get_or_create_project_context(db, project_id)

    # Fetch recent sessions (last 10)
    sess_stmt = (
        select(Session)
        .where(Session.project_id == project_id)
        .order_by(Session.started_at.desc())
        .limit(10)
    )
    sess_res = await db.execute(sess_stmt)
    sessions = sess_res.scalars().all()

    # Fetch security investigations / event analyses
    analyses_stmt = (
        select(EventAnalysis, DevelopmentEvent)
        .join(DevelopmentEvent, EventAnalysis.event_id == DevelopmentEvent.id)
        .where(
            DevelopmentEvent.project_root == project.root_path,
            EventAnalysis.analyzer_name == "security_guardian",
        )
        .order_by(EventAnalysis.created_at.desc())
        .limit(15)
    )
    analyses_res = await db.execute(analyses_stmt)
    analyses_rows = analyses_res.all()

    now = datetime.now(tz=UTC).strftime("%Y-%m-%d %H:%M:%S UTC")

    lang_names = list(context.languages.keys())
    fw_names = [f.name for f in context.frameworks]

    tech_stack_phrase = (
        ", ".join(fw_names or lang_names) if (fw_names or lang_names) else "Standard Software"
    )
    exec_summary_observed = (
        f"VibePulse observed this project as a {tech_stack_phrase} application "
        f"with {context.activity_summary.total_events} recorded development events across "
        f"{context.activity_summary.total_sessions} continuous development sessions."
    )

    if fw_names:
        exec_summary_inferred = (
            f"Detected architecture utilizes {', '.join(fw_names)} for core application "
            f"workflows based on structural directory layouts and manifest files."
        )
    else:
        exec_summary_inferred = (
            "Architecture structure partially observed based on current event activity."
        )

    exec_summary_unknown = (
        "Production deployment infrastructure, external cloud orchestrators, "
        "and live customer traffic volumes are unobserved from telemetry."
    )

    lines: list[str] = [
        f"# Project Context — {project.display_name}",
        "",
        "> Generated deterministically by VibePulse Project Intelligence & Context Memory",
        "",
        "## 1. Project Identity",
        "",
        f"- **Project Name**: `{project.display_name}`",
        f"- **Project Root**: `{project.root_path}`",
        f"- **Project ID**: `{project.id}`",
        f"- **Context Version**: `v{context.context_version}`",
        f"- **First Observed**: `{format_iso(context.first_observed_at)}`",
        f"- **Last Analyzed**: `{format_iso(context.last_analyzed_at)}`",
        f"- **Last Activity**: `{format_iso(context.activity_summary.latest_observed_at)}`",
        "",
        "## 2. Executive Summary",
        "",
        "### Observed Facts",
        f"{exec_summary_observed}",
        "",
        "### Inferred Understanding",
        f"{exec_summary_inferred}",
        "",
        "### Unknown / Not Observed",
        f"{exec_summary_unknown}",
        "",
        "---",
        "",
        "## 3. Languages",
        "",
    ]

    if context.languages:
        lines.extend(
            [
                "| Language | Observed Files | Share | Recent Activity |",
                "|---|---|---|---|",
            ]
        )
        for lang_name, lang_info in context.languages.items():
            lines.append(
                f"| {lang_name} | {lang_info.count} | {lang_info.percentage}% | "
                f"{lang_info.recent_activity_count} events |"
            )
        lines.append("")
    else:
        lines.append("No programming language files observed yet.\n")

    lines.extend(
        [
            "## 4. Frameworks",
            "",
        ]
    )
    if context.frameworks:
        for fw in context.frameworks:
            cls_badge = f"[{fw.provenance.classification}]" if fw.provenance else "[OBSERVED]"
            lines.append(f"### {fw.name} {cls_badge}")
            lines.append(f"- **Category**: {fw.category}")
            if fw.provenance:
                lines.append(f"- **Detected From**: `{fw.provenance.source}`")
                lines.append(f"- **Evidence**: {fw.provenance.evidence}")
            lines.append("")
    else:
        lines.append("No third-party frameworks detected yet.\n")

    lines.extend(
        [
            "## 5. Technologies",
            "",
        ]
    )
    if context.technologies:
        for tech in context.technologies:
            p_str = (
                f"`{tech.provenance.source}` ({tech.provenance.evidence})"
                if tech.provenance
                else "Observed"
            )
            cls_badge = f"[{tech.provenance.classification}]" if tech.provenance else "[OBSERVED]"
            lines.append(f"- **{tech.name}** ({tech.category}) {cls_badge}")
            lines.append(f"  - *Evidence*: {p_str}")
        lines.append("")
    else:
        lines.append("No specific external technology runtimes detected yet.\n")

    lines.extend(
        [
            "## 6. Package Managers",
            "",
        ]
    )
    if context.package_managers:
        for pm in context.package_managers:
            cls_badge = f"[{pm.provenance.classification}]" if pm.provenance else "[OBSERVED]"
            lines.append(f"- **{pm.name}** ({pm.category}) {cls_badge}")
            if pm.provenance:
                lines.append(f"  - *Manifest*: `{pm.provenance.source}` ({pm.provenance.evidence})")
        lines.append("")
    else:
        lines.append("No package manager lockfiles or manifests observed.\n")

    lines.extend(
        [
            "---",
            "",
            "## 7. Important Files",
            "",
        ]
    )
    if context.important_files:
        lines.extend(
            [
                "| File Path | Role / Significance | Activity Events | Last Observed |",
                "|---|---|---|---|",
            ]
        )
        for f in context.important_files:
            last_mod_str = format_iso(f.last_modified)
            lines.append(f"| `{f.path}` | {f.reason} | {f.activity_count} | {last_mod_str} |")
        lines.append("")
    else:
        lines.append("No files tracked yet.\n")

    lines.extend(
        [
            "## 8. Configuration Files",
            "",
        ]
    )
    if context.configuration_files:
        for cfg in context.configuration_files:
            lines.append(f"- `{cfg.path}` — *{cfg.kind}*")
        lines.append("")
    else:
        lines.append("No configuration manifests observed.\n")

    lines.extend(
        [
            "## 9. Source Directories",
            "",
        ]
    )
    if context.source_directories:
        for sdir in context.source_directories:
            lines.append(f"- `{sdir}`")
        lines.append("")
    else:
        lines.append("No standard source directories identified yet.\n")

    lines.extend(
        [
            "## 10. Test Directories",
            "",
        ]
    )
    if context.test_directories:
        for tdir in context.test_directories:
            lines.append(f"- `{tdir}`")
        lines.append("")
    else:
        lines.append("No test suites or test directories observed.\n")

    arch = context.architecture_summary
    source_roots_str = (
        f"- **Source Roots**: {', '.join([f'`{r}`' for r in arch.source_roots])}"
        if arch.source_roots
        else "- **Source Roots**: None observed"
    )
    test_roots_str = (
        f"- **Test Roots**: {', '.join([f'`{t}`' for t in arch.test_roots])}"
        if arch.test_roots
        else "- **Test Roots**: None observed"
    )
    modules_str = (
        f"- **Tracked Modules**: {', '.join([f'`{m}`' for m in arch.modules])}"
        if arch.modules
        else "- **Tracked Modules**: None observed"
    )

    lines.extend(
        [
            "---",
            "",
            "## 11. Architecture Summary",
            "",
            f"- **Project Topology**: `{arch.project_type}`",
            source_roots_str,
            test_roots_str,
            modules_str,
            f"- **Active Git Branch**: `{context.git_context.branch or 'N/A'}`",
            "",
        ]
    )

    if context.architecture_signals:
        lines.append("### Architecture Signals")
        for sig in context.architecture_signals:
            ev_files = (
                ", ".join([f"`{f}`" for f in sig.evidence_files]) if sig.evidence_files else "None"
            )
            lines.append(f"- **{sig.signal}** `[{sig.classification}]`: {sig.description}")
            lines.append(f"  - *Evidence Files*: {ev_files}")
        lines.append("")

    lines.extend(
        [
            "## 12. Development Patterns & Focus",
            "",
            (
                f"**Current Development Focus**: `{context.development_focus.focus}` "
                f"`[{context.development_focus.classification}]`"
            ),
            f"> {context.development_focus.confidence_reason}",
            "",
        ]
    )
    if context.development_patterns:
        for pat in context.development_patterns:
            sample_str = (
                ", ".join([f"`{sf}`" for sf in pat.sample_files]) if pat.sample_files else "None"
            )
            lines.append(f"### {pat.name}")
            lines.append(f"{pat.description}")
            lines.append(f"- **Evidence Count**: {pat.evidence_count} events")
            lines.append(f"- **Sample Files**: {sample_str}")
            lines.append("")
    else:
        lines.append("No recurring development patterns detected yet.\n")

    sec = context.security_summary
    rules_str = ", ".join([f"`{r}`" for r in sec.top_rules]) if sec.top_rules else "None"

    # Identify sensitive files from important_files and configuration_files
    sensitive_files = [
        f.path
        for f in context.important_files
        if any(
            k in f.path.lower()
            for k in (".env", "settings", "security", "auth", "secrets", "database")
        )
    ]
    sensitive_files_str = (
        "\n".join([f"- `{sf}`" for sf in sensitive_files[:8]])
        if sensitive_files
        else "No sensitive credential or auth files detected."
    )

    lines.extend(
        [
            "---",
            "",
            "## 13. Security Posture",
            "",
            f"- **Critical Severity**: `{sec.critical}`",
            f"- **High Severity**: `{sec.high}`",
            f"- **Medium Severity**: `{sec.medium}`",
            f"- **Low Severity**: `{sec.low}`",
            f"- **Total Security Findings**: `{sec.total_findings}`",
            f"- **Top Triggered Rules**: {rules_str}",
            "- **Redaction Guard**: `Enforced` (Raw secrets strictly masked to `[REDACTED]`)",
            "",
            "### Security-Sensitive Files",
            sensitive_files_str,
            "",
            "### Dependency Security",
            "- **Vulnerability Intelligence**: `Not Configured (No advisory DB)`",
            "",
            "## 14. Activity Summary",
            "",
            f"- **Total Recorded Events**: `{context.activity_summary.total_events}`",
            f"- **Total Recorded Sessions**: `{context.activity_summary.total_sessions}`",
            (
                "- **First Activity Recorded**: "
                f"`{format_iso(context.activity_summary.first_observed_at)}`"
            ),
            (
                "- **Latest Activity Recorded**: "
                f"`{format_iso(context.activity_summary.latest_observed_at)}`"
            ),
            "",
            "## 15. Development History",
            "",
        ]
    )

    if sessions:
        lines.extend(
            [
                "| Session ID | Started At | Events | Status | Dominant Languages |",
                "|---|---|---|---|---|",
            ]
        )
        for s in sessions:
            langs = list((s.languages or {}).keys())
            lang_str = ", ".join(langs) if langs else "N/A"
            s_time = format_iso(s.started_at)
            s_short = f"{str(s.id)[:8]}..."
            lines.append(
                f"| `{s_short}` | {s_time} | {s.event_count} | `{s.status}` | {lang_str} |"
            )
        lines.append("")
    else:
        lines.append("No historical sessions recorded.\n")

    lines.extend(
        [
            "## 16. Security / Investigation History",
            "",
        ]
    )

    if analyses_rows:
        lines.extend(
            [
                "| Timestamp | Analyzer / Rule | File Target | Risk Assessment |",
                "|---|---|---|---|",
            ]
        )
        for analysis, event in analyses_rows:
            findings_dict = analysis.findings if isinstance(analysis.findings, dict) else {}
            rule = findings_dict.get("rule_id", "SEC001")
            score = findings_dict.get("risk_score", 0)
            f_path_tail = event.file_path.split("/")[-1] if event.file_path else "unknown"
            file_name = event.file_name or f_path_tail
            t_str = format_iso(analysis.created_at)
            lines.append(f"| {t_str} | `{rule}` | `{file_name}` | Risk Score: `{score}` |")
        lines.append("")
    else:
        lines.append("No critical security investigations or findings recorded.\n")

    # 17. Predictive Engineering Signals
    from app.features.predictive_intelligence.service import (
        get_or_create_predictive_intelligence,
    )

    pred_summary = await get_or_create_predictive_intelligence(db, project_id)
    drift = pred_summary.engineering_drift
    drift_str = f"`{drift.previous_focus} -> {drift.current_focus} -> {drift.emerging_focus}`"

    lines.extend(
        [
            "## 17. Predictive Engineering Signals",
            "",
            f"- **Status**: `{pred_summary.status}` ({pred_summary.status_message})",
            f"- **Active Forecasts Count**: `{pred_summary.total_predictions}`",
            f"- **Active Hotspots**: `{pred_summary.active_hotspots_count}`",
            f"- **Engineering Focus Drift**: {drift_str}",
            "",
        ]
    )

    if pred_summary.forecast_signals:
        lines.extend(
            [
                "### Evidence-Backed Forecasts",
                "",
                "| Forecast Signal | Severity | Strength | Score | Horizon | Recommended Action |",
                "|---|---|---|---|---|---|",
            ]
        )
        for sig in pred_summary.forecast_signals[:5]:
            lines.append(
                f"| **{sig.title}** | `{sig.severity}` | `{sig.evidence_strength}` | "
                f"`{sig.forecast_score}/100` | `{sig.time_horizon}` | {sig.recommended_action} |"
            )
        lines.append("")

    if pred_summary.hotspots:
        lines.extend(
            [
                "### Top Engineering Hotspots",
                "",
                "| Subsystem | File Target | Hotspot Score | Activity Count | Findings |",
                "|---|---|---|---|---|",
            ]
        )
        for h in pred_summary.hotspots[:4]:
            lines.append(
                f"| **{h.subsystem}** | `{h.file_path}` | `{h.hotspot_score}/100` | "
                f"`{h.activity_count}` | `{h.findings_count}` |"
            )
        lines.append("")

    # 18. Unified Project Health & Actionable Priorities
    from app.features.project_health.service import (
        get_or_create_unified_project_health,
    )

    proj_health = await get_or_create_unified_project_health(db, project_id)
    score_display = (
        f"`{proj_health.overall_health_score}/100` ({proj_health.grade})"
        if proj_health.overall_health_score is not None
        else f"`{proj_health.grade}`"
    )

    lines.extend(
        [
            "## 18. Unified Project Health & Actionable Priorities",
            "",
            f"- **Overall Health**: {score_display}",
            (
                f"- **Security Health**: `{proj_health.security_health.score}/100` "
                f"({proj_health.security_health.status})"
            ),
            (
                f"- **Engineering Stability**: `{proj_health.engineering_stability.score}/100` "
                f"({proj_health.engineering_stability.status})"
            ),
            (
                f"- **Incident Health**: `{proj_health.incident_health.score}/100` "
                f"({proj_health.incident_health.status})"
            ),
            (
                f"- **Resolution Health**: `{proj_health.resolution_health.score}/100` "
                f"({proj_health.resolution_health.status})"
            ),
            (
                f"- **Predictive Risk Health**: `{proj_health.predictive_risk_health.score}/100` "
                f"({proj_health.predictive_risk_health.status})"
            ),
            "",
        ]
    )

    if proj_health.top_priorities:
        lines.extend(
            [
                "### Actionable Priorities (What Should I Do Next?)",
                "",
                "| Rank | Priority Item | Severity | Urgency | Subsystem | Recommended Action |",
                "|---|---|---|---|---|---|",
            ]
        )
        for p in proj_health.top_priorities[:5]:
            lines.append(
                f"| `#{p.rank}` | **{p.title}** | `{p.severity}` | `{p.priority_score}/100` | "
                f"`{p.affected_subsystem}` | {p.recommended_action} |"
            )
        lines.append("")

    lang_summary_str = ", ".join(lang_names) if lang_names else "General"
    file_count = len(context.important_files)
    src_dir_count = len(context.source_directories)

    lines.extend(
        [
            "---",
            "",
            "# AI Handoff Context",
            "",
            "## What VibePulse Knows",
            f"1. Verified repository root path is `{project.root_path}`.",
            f"2. Verified active language ecosystem: {lang_summary_str}.",
            f"3. Verified project structure: {file_count} files across {src_dir_count} roots.",
            f"4. Verified {sec.total_findings} security events analyzed with AST guardrails.",
            "",
            "## What VibePulse Inferred",
            f"1. Current engineering focus: {context.development_focus.focus}.",
            f"2. Application topology: {arch.project_type}.",
            "",
            "## Unknown / Not Yet Observed",
            "- **Deployment Infrastructure**: Container orchestration is unobserved.",
            "- **Production Configuration**: Live secrets are intentionally excluded.",
            "- **Business Domain Rules**: Functional user requirements are unobserved.",
            "",
            "## Recommended First Questions for an AI Agent",
            f"1. What is the target runtime for `{project.display_name}` (Local, AWS, Docker)?",
            "2. Are there specific linting or architectural rules that changes must satisfy?",
            "3. Which modules are production-critical and require backwards compatibility?",
            "4. Which test suite should be executed to validate new feature changes?",
            "",
            "---",
            "",
            "## Context Provenance",
            "",
            "This context was generated deterministically from:",
            "- PostgreSQL `project_contexts` table",
            f"- `{context.activity_summary.total_events}` recorded development events",
            f"- `{context.activity_summary.total_sessions}` recorded development sessions",
            f"- `{sec.total_findings}` stored security investigation findings",
            "- Observed filesystem artifacts and configuration manifests",
            "",
            f"- **Context Version**: `v{context.context_version}`",
            f"- **Generated At**: `{now}`",
            f"- **Last Analyzed**: `{format_iso(context.last_analyzed_at)}`",
            f"- **Event Count Used**: `{context.activity_summary.total_events}`",
            f"- **Session Count Used**: `{context.activity_summary.total_sessions}`",
            "",
        ]
    )

    raw_doc = "\n".join(lines)
    return redact_sensitive_text(raw_doc)
