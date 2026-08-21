import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.project_context.models import ProjectContext
from app.features.project_context.schemas import ProjectContextRead
from app.features.projects.models import Project
from app.features.sessions.models import Session

logger = get_logger(__name__)


# Deterministic Extension -> Language Mapping
EXTENSION_TO_LANGUAGE: dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".cpp": "C++",
    ".cc": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".css": "CSS",
    ".scss": "SCSS",
    ".html": "HTML",
    ".sql": "SQL",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".md": "Markdown",
    ".sh": "Shell",
    ".ps1": "PowerShell",
}

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
}


async def aggregate_project_context(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any]:
    """
    Deterministically computes the complete Project Context from stored PostgreSQL
    evidence (projects, sessions, development_events, event_analyses).
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    # 1. Fetch all events for this project (by project_root or matching sessions)
    events_stmt = (
        select(DevelopmentEvent)
        .where(DevelopmentEvent.project_root == project.root_path)
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    events_res = await db.execute(events_stmt)
    events = events_res.scalars().all()

    # 2. Fetch all sessions for this project
    sessions_stmt = (
        select(Session).where(Session.project_id == project_id).order_by(Session.started_at.asc())
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

    # ── AGGREGATE LANGUAGES ──────────────────────────────────────────────────
    lang_counts: dict[str, int] = {}
    file_hit_counts: dict[str, int] = {}
    file_last_modified: dict[str, datetime] = {}
    observed_files_set: set[str] = set()
    git_branches: set[str] = set()

    for e in events:
        # File counting
        if e.file_path:
            norm_path = e.file_path.replace("\\", "/")
            observed_files_set.add(norm_path)
            file_hit_counts[norm_path] = file_hit_counts.get(norm_path, 0) + 1
            if norm_path not in file_last_modified or e.timestamp > file_last_modified[norm_path]:
                file_last_modified[norm_path] = e.timestamp

        # Language attribution
        lang = e.language
        if not lang and e.file_extension:
            lang = EXTENSION_TO_LANGUAGE.get(e.file_extension.lower())

        if lang:
            # Normalize display
            lang_clean = lang.replace(" (React)", "")
            lang_counts[lang_clean] = lang_counts.get(lang_clean, 0) + 1

        if e.git_branch:
            git_branches.add(e.git_branch)

    total_lang_events = sum(lang_counts.values())
    languages_data: dict[str, dict[str, Any]] = {}
    for l_name, l_count in sorted(lang_counts.items(), key=lambda x: -x[1]):
        pct = round((l_count / total_lang_events) * 100, 1) if total_lang_events > 0 else 0.0
        languages_data[l_name] = {"count": l_count, "percentage": pct}

    # ── DETECT FRAMEWORKS & TECHNOLOGIES (WITH STRICT PROVENANCE) ────────────
    frameworks: list[dict[str, Any]] = []
    technologies: list[dict[str, Any]] = []
    package_managers: list[dict[str, Any]] = []
    detected_tech_names: set[str] = set()

    def add_tech(
        target_list: list[dict[str, Any]],
        name: str,
        category: str,
        source: str,
        evidence: str,
    ) -> None:
        if name not in detected_tech_names:
            detected_tech_names.add(name)
            target_list.append(
                {
                    "name": name,
                    "category": category,
                    "provenance": {
                        "source": source,
                        "evidence": evidence,
                        "detection_type": "deterministic",
                    },
                }
            )

    for f_path in observed_files_set:
        f_lower = f_path.lower()
        base_name = f_path.split("/")[-1]

        # React
        if f_lower.endswith((".tsx", ".jsx")) or "react" in f_lower:
            add_tech(
                frameworks,
                "React",
                "Frontend UI Library",
                f_path,
                "React TSX/JSX component structure",
            )

        # FastAPI
        if "fastapi" in f_lower or f_lower.endswith("main.py") or "app/features" in f_lower:
            add_tech(
                frameworks,
                "FastAPI",
                "Backend Web Framework",
                f_path,
                "FastAPI application entrypoint and feature modules",
            )

        # TailwindCSS
        if "tailwind.config" in f_lower:
            add_tech(
                frameworks,
                "TailwindCSS",
                "CSS Design System",
                base_name,
                "Tailwind configuration file",
            )

        # Alembic
        if "alembic.ini" in f_lower or "alembic/versions" in f_lower:
            add_tech(
                frameworks,
                "Alembic",
                "Database Migrations",
                base_name,
                "Alembic migration version scripts",
            )

        # Pytest
        if "conftest.py" in f_lower or "pytest.ini" in f_lower or "/tests/" in f_lower:
            add_tech(
                frameworks,
                "Pytest",
                "Testing Framework",
                base_name,
                "Pytest configuration and test hierarchy",
            )

        # TypeScript
        if f_lower.endswith((".ts", ".tsx")) or "tsconfig.json" in f_lower:
            add_tech(
                technologies,
                "TypeScript",
                "Programming Language",
                base_name,
                "Static typing and TypeScript source files",
            )

        # Python
        if f_lower.endswith(".py") or "pyproject.toml" in f_lower:
            add_tech(
                technologies,
                "Python",
                "Programming Language",
                base_name,
                "Python 3 runtime and modules",
            )

        # PostgreSQL
        if "postgres" in f_lower or "database.py" in f_lower or f_lower.endswith(".sql"):
            add_tech(
                technologies,
                "PostgreSQL",
                "Relational Database",
                f_path,
                "PostgreSQL schema and database access layer",
            )

        # Redis
        if "redis" in f_lower:
            add_tech(
                technologies,
                "Redis",
                "In-Memory Cache",
                f_path,
                "Redis client connection and cache layer",
            )

        # Docker
        if "docker" in f_lower:
            add_tech(
                technologies,
                "Docker",
                "Containerization",
                base_name,
                "Docker container definition",
            )

        # Package Managers
        if "pnpm-lock.yaml" in f_lower or "pnpm-workspace.yaml" in f_lower:
            add_tech(
                package_managers,
                "pnpm",
                "Package Manager",
                base_name,
                "pnpm lockfile and workspace config",
            )
        elif "package-lock.json" in f_lower:
            add_tech(
                package_managers,
                "npm",
                "Package Manager",
                base_name,
                "npm lockfile",
            )
        elif "uv.lock" in f_lower or ("pyproject.toml" in f_lower and "uv" in f_lower):
            add_tech(
                package_managers,
                "uv",
                "Python Package Manager",
                base_name,
                "uv project manifest",
            )
        elif "requirements.txt" in f_lower or "pipfile" in f_lower:
            add_tech(
                package_managers,
                "pip",
                "Python Package Manager",
                base_name,
                "pip requirements manifest",
            )

    # ── DETECT CONFIGURATION FILES ───────────────────────────────────────────
    configuration_files: list[dict[str, Any]] = []
    for f_path in observed_files_set:
        base_name = f_path.split("/")[-1]
        if base_name in CONFIG_PATTERNS:
            configuration_files.append(
                {
                    "path": f_path,
                    "kind": CONFIG_PATTERNS[base_name],
                }
            )

    # ── DETECT DIRECTORIES (SOURCE & TEST) ───────────────────────────────────
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
    # Rank by hit count + structural significance
    for f_path, count in sorted(file_hit_counts.items(), key=lambda x: -x[1]):
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
    first_obs = min((e.timestamp for e in events), default=None)
    latest_obs = max((e.timestamp for e in events), default=None)
    top_frequent = [
        {"path": k, "event_count": v}
        for k, v in sorted(file_hit_counts.items(), key=lambda x: -x[1])[:10]
    ]

    activity_summary = {
        "total_sessions": len(sessions),
        "total_events": len(events),
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
        "branch": next(iter(git_branches)) if git_branches else None,
        "tracked_branches": sorted(git_branches),
    }

    now = datetime.now(tz=UTC)

    return {
        "project_id": project_id,
        "languages": languages_data,
        "frameworks": frameworks,
        "technologies": technologies,
        "package_managers": package_managers,
        "important_files": important_files[:15],
        "configuration_files": configuration_files[:10],
        "test_directories": sorted(test_dirs),
        "source_directories": sorted(source_dirs),
        "git_context": git_context,
        "development_patterns": development_patterns,
        "security_summary": security_summary,
        "activity_summary": activity_summary,
        "architecture_summary": architecture_summary,
        "context_version": 1,
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
        data = await aggregate_project_context(db, project_id)
        now = datetime.now(tz=UTC)
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
            git_context=data["git_context"],
            development_patterns=data["development_patterns"],
            security_summary=data["security_summary"],
            activity_summary=data["activity_summary"],
            architecture_summary=data["architecture_summary"],
            context_version=1,
            first_observed_at=data["first_observed_at"],
            last_analyzed_at=now,
        )
        db.add(context_row)
        await db.commit()
        await db.refresh(context_row)

    return _to_read_schema(context_row, project)


async def refresh_project_context(db: AsyncSession, project_id: uuid.UUID) -> ProjectContextRead:
    """
    Recomputes derived Project Context from stored evidence and updates the durable record.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    data = await aggregate_project_context(db, project_id)
    now = datetime.now(tz=UTC)

    stmt = select(ProjectContext).where(ProjectContext.project_id == project_id)
    res = await db.execute(stmt)
    context_row = res.scalar_one_or_none()

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
            git_context=data["git_context"],
            development_patterns=data["development_patterns"],
            security_summary=data["security_summary"],
            activity_summary=data["activity_summary"],
            architecture_summary=data["architecture_summary"],
            context_version=1,
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
        context_row.git_context = data["git_context"]
        context_row.development_patterns = data["development_patterns"]
        context_row.security_summary = data["security_summary"]
        context_row.activity_summary = data["activity_summary"]
        context_row.architecture_summary = data["architecture_summary"]
        context_row.first_observed_at = data["first_observed_at"]
        context_row.last_analyzed_at = now
        context_row.updated_at = now

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

    # Check if context exists
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
            "context_version": row.context_version,
            "first_observed_at": row.first_observed_at,
            "last_analyzed_at": row.last_analyzed_at,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
    )
