import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.domain.events import AnalyzableEvent
from app.core.logging import get_logger
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.project_context.detectors import (
    compute_activity_heatmap,
    detect_architecture_signals,
    detect_frameworks,
    detect_git_intelligence,
    detect_languages,
    detect_package_managers,
    detect_technologies,
    determine_development_focus,
    rank_file_activity,
)
from app.features.project_context.models import ProjectContext
from app.features.project_context.schemas import ProjectContextRead
from app.features.projects.models import Project
from app.features.sessions.models import Session

logger = get_logger(__name__)

# Known Configuration Filename Patterns
CONFIG_PATTERNS: dict[str, str] = {
    "package.json": "Node/JavaScript Package Manifest",
    "pnpm-lock.yaml": "pnpm Lockfile",
    "pnpm-workspace.yaml": "pnpm Monorepo Workspace Configuration",
    "pyproject.toml": "Python Project & Build Configuration",
    "uv.lock": "uv Package Lockfile",
    "requirements.txt": "Python Requirements Manifest",
    "alembic.ini": "Alembic Database Migration Configuration",
    "vite.config.ts": "Vite Bundler & Dev Server Config",
    "vite.config.js": "Vite Bundler & Dev Server Config",
    "tsconfig.json": "TypeScript Compiler Options",
    "tailwind.config.ts": "TailwindCSS Design System Configuration",
    "tailwind.config.js": "TailwindCSS Design System Configuration",
    "docker-compose.yml": "Docker Compose Orchestration",
    "Dockerfile": "Docker Container Definition",
    ".env": "Environment Variables",
    ".env.example": "Environment Variables Template",
    "turbo.json": "Turborepo Monorepo Configuration",
    "Cargo.toml": "Rust Package Manifest",
    "Cargo.lock": "Rust Lockfile",
}


def _orm_event_to_analyzable(orm: DevelopmentEvent) -> AnalyzableEvent:
    return AnalyzableEvent(
        id=orm.id,
        event_type=orm.event_type,
        timestamp=orm.timestamp,
        session_id=orm.session_id,
        project_root=orm.project_root,
        file_path=orm.file_path,
        file_name=orm.file_name,
        file_extension=orm.file_extension,
        language=orm.language,
        git_branch=orm.git_branch,
        metadata=orm.event_metadata or {},
    )


async def aggregate_project_context(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any]:
    """
    Deterministically computes the complete Project Context and Project Intelligence
    from stored PostgreSQL evidence (projects, sessions, development_events, event_analyses).

    Invariants:
      - This is a pure projection / materialized calculation over PostgreSQL historical truth.
      - Can be safely run repeatedly to reconstruct project intelligence without data loss.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    # 1. Fetch all historical events for this project
    events_stmt = (
        select(DevelopmentEvent)
        .where(DevelopmentEvent.project_root == project.root_path)
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    events_res = await db.execute(events_stmt)
    orm_events = events_res.scalars().all()
    analyzable_events = [_orm_event_to_analyzable(e) for e in orm_events]

    # 2. Fetch all sessions for this project (by project_id or project_root)
    sessions_stmt = (
        select(Session)
        .where(
            or_(
                Session.project_id == project_id,
                Session.project_root == project.root_path,
            )
        )
        .order_by(Session.started_at.asc())
    )
    sessions_res = await db.execute(sessions_stmt)
    sessions = sessions_res.scalars().all()

    # 3. Fetch all security findings / analyses for this project
    analyses_stmt = (
        select(EventAnalysis)
        .join(DevelopmentEvent, EventAnalysis.event_id == DevelopmentEvent.id)
        .where(DevelopmentEvent.project_root == project.root_path)
    )
    analyses_res = await db.execute(analyses_stmt)
    analyses = analyses_res.scalars().all()

    # ── OBSERVED FILES SET ───────────────────────────────────────────────────
    observed_files_set: set[str] = set()
    file_hit_counts: dict[str, int] = {}
    file_last_modified: dict[str, datetime] = {}
    git_branches: set[str] = set()

    for e in analyzable_events:
        if e.file_path:
            norm_path = e.file_path.replace("\\", "/")
            observed_files_set.add(norm_path)
            file_hit_counts[norm_path] = file_hit_counts.get(norm_path, 0) + 1
            if norm_path not in file_last_modified or (
                e.timestamp and e.timestamp > file_last_modified[norm_path]
            ):
                if e.timestamp:
                    file_last_modified[norm_path] = e.timestamp

        if e.git_branch:
            git_branches.add(e.git_branch)

    # Incorporate files recorded in session aggregates
    for s in sessions:
        if s.files and isinstance(s.files, dict):
            for f_path, count in s.files.items():
                norm_path = f_path.replace("\\", "/")
                observed_files_set.add(norm_path)
                file_hit_counts[norm_path] = file_hit_counts.get(norm_path, 0) + count
        if s.git_branch:
            git_branches.add(s.git_branch)

    # ── PURE DETECTORS ───────────────────────────────────────────────────────
    languages = detect_languages(observed_files_set, analyzable_events)
    package_managers = detect_package_managers(observed_files_set, project.root_path)
    frameworks = detect_frameworks(observed_files_set, analyzable_events, project.root_path)
    technologies = detect_technologies(observed_files_set, analyzable_events, project.root_path)
    architecture_signals = detect_architecture_signals(
        observed_files_set, analyzable_events, frameworks, technologies
    )
    git_intel = detect_git_intelligence(project.root_path)
    heatmap_cells = compute_activity_heatmap(analyzable_events)
    dev_focus = determine_development_focus(analyzable_events, window_days=7)
    file_rankings = rank_file_activity(analyzable_events, limit=15)

    # ── CONFIGURATION FILES & DIRECTORIES ────────────────────────────────────
    configuration_files: list[dict[str, Any]] = []
    for f_path in observed_files_set:
        base_name = f_path.split("/")[-1]
        if base_name in CONFIG_PATTERNS:
            configuration_files.append({"path": f_path, "kind": CONFIG_PATTERNS[base_name]})

    source_dirs: set[str] = set()
    test_dirs: set[str] = set()
    for f_path in observed_files_set:
        parts = f_path.split("/")
        if len(parts) > 1:
            for idx, part in enumerate(parts[:-1]):
                p_lower = part.lower()
                if p_lower in ("test", "tests", "__tests__", "spec"):
                    test_dirs.add("/".join(parts[: idx + 1]))
                elif p_lower in (
                    "src",
                    "app",
                    "packages",
                    "lib",
                    "components",
                    "pages",
                    "features",
                ):
                    source_dirs.add("/".join(parts[: idx + 1]))

    # ── IMPORTANT FILES ──────────────────────────────────────────────────────
    important_files: list[dict[str, Any]] = []
    for f_path, count in sorted(file_hit_counts.items(), key=lambda x: -x[1])[:15]:
        base = f_path.split("/")[-1].lower()
        reason = "Frequently Observed Development Target"
        if "auth" in base or "secret" in base or "security" in base:
            reason = "Security & Credential Sensitive File"
        elif any(entry in base for entry in ("main.py", "index.ts", "app.tsx", "server.ts")):
            reason = "Core Application Entrypoint"
        elif base in CONFIG_PATTERNS:
            reason = CONFIG_PATTERNS[base]

        last_mod = file_last_modified.get(f_path)
        important_files.append(
            {
                "path": f_path,
                "reason": reason,
                "activity_count": count,
                "last_modified": last_mod.isoformat() if last_mod else None,
            }
        )

    # ── DEVELOPMENT PATTERNS ─────────────────────────────────────────────────
    development_patterns: list[dict[str, Any]] = []
    auth_files = [f for f in observed_files_set if "auth" in f.lower() or "secret" in f.lower()]
    if auth_files:
        development_patterns.append(
            {
                "name": "Authentication & Credential Security",
                "description": "Continuous activity on authentication handlers and credentials.",
                "evidence_count": len(auth_files),
                "sample_files": auth_files[:3],
            }
        )

    api_files = [
        f
        for f in observed_files_set
        if any(term in f.lower() for term in ("api", "router", "endpoint"))
    ]
    if api_files:
        development_patterns.append(
            {
                "name": "API & Endpoint Architecture",
                "description": "Active modification of HTTP routing, schemas, and endpoints.",
                "evidence_count": len(api_files),
                "sample_files": api_files[:3],
            }
        )

    db_files = [
        f
        for f in observed_files_set
        if any(term in f.lower() for term in ("alembic", "model", "database", ".sql"))
    ]
    if db_files:
        development_patterns.append(
            {
                "name": "Database Schema & Persistence Engineering",
                "description": "Development on ORM entities, migrations, and persistence.",
                "evidence_count": len(db_files),
                "sample_files": db_files[:3],
            }
        )

    ui_files = [
        f
        for f in observed_files_set
        if f.lower().endswith((".tsx", ".jsx"))
        or any(term in f.lower() for term in ("component", "pages"))
    ]
    if ui_files:
        development_patterns.append(
            {
                "name": "Frontend UI & Component Engineering",
                "description": "User interface design, React components, and state management.",
                "evidence_count": len(ui_files),
                "sample_files": ui_files[:3],
            }
        )

    test_files = [f for f in observed_files_set if "test" in f.lower()]
    if test_files:
        development_patterns.append(
            {
                "name": "Automated Quality Assurance & Verification",
                "description": "Regression test suite maintenance and automated verification.",
                "evidence_count": len(test_files),
                "sample_files": test_files[:3],
            }
        )

    # ── SECURITY SUMMARY ─────────────────────────────────────────────────────
    crit_count = 0
    high_count = 0
    med_count = 0
    low_count = 0
    top_rules: list[str] = []
    total_findings_count = 0

    for a in analyses:
        findings_dict = a.findings if isinstance(a.findings, dict) else {}
        sec_findings = findings_dict.get("findings", [])
        risk_score = findings_dict.get("risk_score", 0)

        if sec_findings:
            for f in sec_findings:
                total_findings_count += 1
                rule_id = f.get("rule_id", "SEC001")
                sev = f.get("severity", "LOW").upper()
                if sev == "CRITICAL" or risk_score >= 80:
                    crit_count += 1
                elif sev == "HIGH" or risk_score >= 60:
                    high_count += 1
                elif sev == "MEDIUM" or risk_score >= 30:
                    med_count += 1
                else:
                    low_count += 1
                if rule_id not in top_rules:
                    top_rules.append(rule_id)
        elif a.analyzer_name == "security_guardian" and findings_dict:
            total_findings_count += 1
            crit_count += 1
            if "SEC001" not in top_rules:
                top_rules.append("SEC001")

    security_summary = {
        "total_findings": total_findings_count,
        "critical": crit_count,
        "high": high_count,
        "medium": med_count,
        "low": low_count,
        "top_rules": top_rules[:5],
    }

    # ── ACTIVITY SUMMARY ─────────────────────────────────────────────────────
    first_obs = min((e.timestamp for e in analyzable_events if e.timestamp), default=None)
    latest_obs = max((e.timestamp for e in analyzable_events if e.timestamp), default=None)
    if not first_obs and sessions:
        first_obs = min((s.started_at for s in sessions if s.started_at), default=None)
    if not latest_obs and sessions:
        latest_obs = max((s.last_event_at for s in sessions if s.last_event_at), default=None)

    total_events_count = len(analyzable_events) or sum(s.event_count for s in sessions)
    top_frequent = [
        {"path": k, "event_count": v}
        for k, v in sorted(file_hit_counts.items(), key=lambda x: -x[1])[:10]
    ]

    activity_summary = {
        "total_sessions": len(sessions),
        "total_events": total_events_count,
        "first_observed_at": first_obs.isoformat() if first_obs else None,
        "latest_observed_at": latest_obs.isoformat() if latest_obs else None,
        "frequently_observed_files": top_frequent,
    }

    # ── ARCHITECTURE SUMMARY ─────────────────────────────────────────────────
    is_monorepo = (
        "pnpm-workspace.yaml" in [f.split("/")[-1] for f in observed_files_set]
        or len(source_dirs) > 2
    )
    proj_type = "Monorepo Workspace" if is_monorepo else "Standard Application"
    modules = sorted({p.split("/")[0] for p in observed_files_set if "/" in p})

    architecture_summary = {
        "project_type": proj_type,
        "source_roots": sorted(source_dirs)[:10],
        "test_roots": sorted(test_dirs)[:5],
        "modules": modules[:8],
    }

    git_context = {
        "branch": git_intel.branch or (next(iter(git_branches)) if git_branches else None),
        "tracked_branches": sorted(git_branches),
    }

    now = datetime.now(tz=UTC)

    return {
        "project_id": project_id,
        "languages": {k: v.model_dump(mode="json") for k, v in languages.items()},
        "frameworks": [f.model_dump(mode="json") for f in frameworks],
        "technologies": [t.model_dump(mode="json") for t in technologies],
        "package_managers": [p.model_dump(mode="json") for p in package_managers],
        "important_files": important_files,
        "configuration_files": configuration_files,
        "test_directories": sorted(test_dirs),
        "source_directories": sorted(source_dirs),
        "git_context": git_context,
        "development_patterns": development_patterns,
        "security_summary": security_summary,
        "activity_summary": activity_summary,
        "architecture_summary": architecture_summary,
        "development_focus": dev_focus.model_dump(mode="json"),
        "activity_heatmap": [c.model_dump(mode="json") for c in heatmap_cells],
        "file_rankings": [r.model_dump(mode="json") for r in file_rankings],
        "architecture_signals": [s.model_dump(mode="json") for s in architecture_signals],
        "git_intelligence": git_intel.model_dump(mode="json"),
        "context_version": 2,
        "first_observed_at": first_obs,
        "last_analyzed_at": now,
    }


async def get_or_create_project_context(
    db: AsyncSession, project_id: uuid.UUID
) -> ProjectContextRead:
    """
    Retrieves the durable ProjectContext row from PostgreSQL or computes and persists
    it if it does not yet exist.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    stmt = select(ProjectContext).where(ProjectContext.project_id == project_id)
    res = await db.execute(stmt)
    context_row = res.scalar_one_or_none()

    if context_row is None:
        return await refresh_project_context(db, project_id)

    return _to_read_schema(context_row, project)


async def refresh_project_context(db: AsyncSession, project_id: uuid.UUID) -> ProjectContextRead:
    """
    Pure projection recomputation from PostgreSQL events and sessions.
    Updates the materialized ProjectContext row idempotently.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    data = await aggregate_project_context(db, project_id)
    now = datetime.now(tz=UTC)

    stmt = select(ProjectContext).where(ProjectContext.project_id == project_id)
    res = await db.execute(stmt)
    context_row = res.scalar_one_or_none()

    # Package projection-extended fields inside architecture_summary / activity_summary
    # to maintain backward compatibility with the existing PostgreSQL schema
    arch_payload = dict(data["architecture_summary"])
    arch_payload["architecture_signals"] = data["architecture_signals"]

    act_payload = dict(data["activity_summary"])
    act_payload["activity_heatmap"] = data["activity_heatmap"]
    act_payload["file_rankings"] = data["file_rankings"]
    act_payload["development_focus"] = data["development_focus"]

    git_payload = dict(data["git_context"])
    git_payload["git_intelligence"] = data["git_intelligence"]

    if context_row is None:
        context_row = ProjectContext(
            project_id=project_id,
            languages=data["languages"],
            frameworks=data["frameworks"],
            technologies=data["technologies"],
            package_managers=data["package_managers"],
            important_files=data["important_files"],
            configuration_files=data["configuration_files"],
            test_directories=data["test_directories"],
            source_directories=data["source_directories"],
            git_context=git_payload,
            development_patterns=data["development_patterns"],
            security_summary=data["security_summary"],
            activity_summary=act_payload,
            architecture_summary=arch_payload,
            context_version=2,
            first_observed_at=data["first_observed_at"],
            last_analyzed_at=now,
        )
        db.add(context_row)
    else:
        context_row.languages = data["languages"]
        context_row.frameworks = data["frameworks"]
        context_row.technologies = data["technologies"]
        context_row.package_managers = data["package_managers"]
        context_row.important_files = data["important_files"]
        context_row.configuration_files = data["configuration_files"]
        context_row.test_directories = data["test_directories"]
        context_row.source_directories = data["source_directories"]
        context_row.git_context = git_payload
        context_row.development_patterns = data["development_patterns"]
        context_row.security_summary = data["security_summary"]
        context_row.activity_summary = act_payload
        context_row.architecture_summary = arch_payload
        context_row.first_observed_at = data["first_observed_at"]
        context_row.last_analyzed_at = now
        context_row.updated_at = now
        context_row.context_version = 2

    await db.commit()
    await db.refresh(context_row)
    return _to_read_schema(context_row, project)


async def touch_project_context_on_event(
    db: AsyncSession,
    project_root: str,
    file_path: str | None = None,
    language: str | None = None,
) -> None:
    """
    Lightweight incremental update triggered during event ingestion.
    Updates observation timestamps and lightweight activity counters.
    """
    stmt = select(Project).where(Project.root_path == project_root)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        return

    c_stmt = select(ProjectContext).where(ProjectContext.project_id == project.id)
    c_res = await db.execute(c_stmt)
    context_row = c_res.scalar_one_or_none()

    now = datetime.now(tz=UTC)
    if context_row is not None:
        act = dict(context_row.activity_summary or {})
        act["total_events"] = int(act.get("total_events", 0)) + 1
        act["latest_observed_at"] = now.isoformat()
        context_row.activity_summary = act
        context_row.last_analyzed_at = now
        context_row.updated_at = now
        await db.commit()


def _to_read_schema(row: ProjectContext, project: Project) -> ProjectContextRead:
    arch = dict(row.architecture_summary or {})
    act = dict(row.activity_summary or {})
    git = dict(row.git_context or {})

    arch_signals = arch.get("architecture_signals", [])
    heatmap = act.get("activity_heatmap", [])
    rankings = act.get("file_rankings", [])
    focus = act.get("development_focus", {})
    git_intel = git.get("git_intelligence", {})

    return ProjectContextRead.model_validate(
        {
            "id": row.id,
            "project_id": row.project_id,
            "project_display_name": project.display_name,
            "project_root_path": project.root_path,
            "languages": row.languages or {},
            "frameworks": row.frameworks or [],
            "technologies": row.technologies or [],
            "package_managers": row.package_managers or [],
            "important_files": row.important_files or [],
            "configuration_files": row.configuration_files or [],
            "test_directories": row.test_directories or [],
            "source_directories": row.source_directories or [],
            "git_context": row.git_context or {},
            "development_patterns": row.development_patterns or [],
            "security_summary": row.security_summary or {},
            "activity_summary": row.activity_summary or {},
            "architecture_summary": row.architecture_summary or {},
            "development_focus": focus,
            "activity_heatmap": heatmap,
            "file_rankings": rankings,
            "architecture_signals": arch_signals,
            "git_intelligence": git_intel,
            "context_version": row.context_version,
            "first_observed_at": row.first_observed_at,
            "last_analyzed_at": row.last_analyzed_at,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
    )
