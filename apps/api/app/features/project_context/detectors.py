"""
Project Intelligence Detectors.

Deterministic, evidence-backed analyzers that project historical development events,
sessions, and project filesystem manifests into structured project intelligence.
"""

import pathlib
import shutil
import subprocess
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.domain.events import AnalyzableEvent
from app.features.project_context.schemas import (
    ActivityHeatmapCell,
    ArchitectureSignalDetail,
    DevelopmentFocusDetail,
    EvidenceProvenance,
    FileActivityRanking,
    GitIntelligenceDetail,
    LanguageDistribution,
    TechnologyDetail,
)

# ── EXTENSION TO LANGUAGE MAPPING ─────────────────────────────────────────────
EXTENSION_LANGUAGE_MAP: dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".sh": "Shell",
    ".bash": "Shell",
    ".ps1": "PowerShell",
    ".toml": "TOML",
}


def detect_languages(
    observed_files: set[str],
    events: list[AnalyzableEvent],
) -> dict[str, LanguageDistribution]:
    """
    Computes language distribution with file counts, relative percentages,
    and recent activity weighting from observed file paths and event telemetry.
    """
    lang_counts: dict[str, int] = {}
    lang_recent_events: dict[str, int] = {}

    cutoff_recent = datetime.now(tz=UTC) - timedelta(days=7)

    for path_str in observed_files:
        ext = pathlib.Path(path_str).suffix.lower()
        lang = EXTENSION_LANGUAGE_MAP.get(ext)
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

    for ev in events:
        if ev.language:
            lang = ev.language
            if lang not in lang_counts:
                lang_counts[lang] = lang_counts.get(lang, 0) + 1
            if ev.timestamp and ev.timestamp >= cutoff_recent:
                lang_recent_events[lang] = lang_recent_events.get(lang, 0) + 1

    total_files = sum(lang_counts.values())
    if total_files == 0:
        return {}

    distribution: dict[str, LanguageDistribution] = {}
    for lang, count in sorted(lang_counts.items(), key=lambda x: -x[1]):
        pct = round((count / total_files) * 100.0, 1)
        distribution[lang] = LanguageDistribution(
            count=count,
            percentage=pct,
            recent_activity_count=lang_recent_events.get(lang, 0),
        )

    return distribution


def detect_package_managers(
    observed_files: set[str],
    project_root: str,
) -> list[TechnologyDetail]:
    """
    Detects package managers from lockfiles and project manifests.
    """
    detected: list[TechnologyDetail] = []
    seen: set[str] = set()

    file_basenames = {pathlib.Path(f).name.lower() for f in observed_files}

    def has_file(fname: str) -> bool:
        if fname.lower() in file_basenames:
            return True
        try:
            return (pathlib.Path(project_root) / fname).exists()
        except Exception:
            return False

    manifest_checks: list[tuple[str, str, str, str]] = [
        ("pnpm-lock.yaml", "pnpm", "Lockfile pnpm-lock.yaml present", "OBSERVED"),
        ("package-lock.json", "npm", "Lockfile package-lock.json present", "OBSERVED"),
        ("yarn.lock", "yarn", "Lockfile yarn.lock present", "OBSERVED"),
        ("bun.lockb", "bun", "Lockfile bun.lockb present", "OBSERVED"),
        ("bun.lock", "bun", "Lockfile bun.lock present", "OBSERVED"),
        ("uv.lock", "uv", "Lockfile uv.lock present", "OBSERVED"),
        ("poetry.lock", "poetry", "Lockfile poetry.lock present", "OBSERVED"),
        ("Pipfile.lock", "pipenv", "Lockfile Pipfile.lock present", "OBSERVED"),
        ("requirements.txt", "pip", "Manifest requirements.txt present", "OBSERVED"),
        ("pyproject.toml", "pip/build", "Configuration pyproject.toml present", "OBSERVED"),
        ("Cargo.lock", "cargo", "Lockfile Cargo.lock present", "OBSERVED"),
        ("Cargo.toml", "cargo", "Manifest Cargo.toml present", "OBSERVED"),
        ("go.sum", "go modules", "Lockfile go.sum present", "OBSERVED"),
        ("go.mod", "go modules", "Manifest go.mod present", "OBSERVED"),
        ("pom.xml", "maven", "Manifest pom.xml present", "OBSERVED"),
        ("build.gradle", "gradle", "Build file build.gradle present", "OBSERVED"),
    ]

    for filename, pm_name, evidence_str, classification in manifest_checks:
        if pm_name not in seen and has_file(filename):
            seen.add(pm_name)
            detected.append(
                TechnologyDetail(
                    name=pm_name,
                    category="Package Manager",
                    provenance=EvidenceProvenance(
                        source=filename,
                        evidence=evidence_str,
                        classification=classification,
                        confidence_reason="Determined from package manager manifest / lockfile",
                    ),
                )
            )

    return detected


def _safely_read_file_head(project_root: str, relative_path: str, max_bytes: int = 16384) -> str:
    """Safely reads the top bytes of a project manifest or configuration file."""
    try:
        p = pathlib.Path(project_root) / relative_path
        if p.is_file() and p.stat().st_size <= 2 * 1024 * 1024:
            with open(p, encoding="utf-8", errors="ignore") as f:
                return f.read(max_bytes)
    except Exception:
        return ""
    return ""


def detect_frameworks(
    observed_files: set[str],
    events: list[AnalyzableEvent],
    project_root: str,
) -> list[TechnologyDetail]:
    frameworks: list[TechnologyDetail] = []
    seen: set[str] = set()

    pkg_json_content = _safely_read_file_head(project_root, "package.json")
    pyproject_content = _safely_read_file_head(project_root, "pyproject.toml")
    requirements_content = _safely_read_file_head(project_root, "requirements.txt")
    cargo_content = _safely_read_file_head(project_root, "Cargo.toml")

    manifest_bundle = (
        f"{pkg_json_content}\n{pyproject_content}\n{requirements_content}\n{cargo_content}".lower()
    )

    framework_signatures: list[dict[str, Any]] = [
        {
            "name": "FastAPI",
            "category": "Backend Framework",
            "keywords": ["fastapi"],
            "manifest_keys": ["fastapi"],
            "sample_files": ["app/main.py", "src/main.py", "main.py"],
        },
        {
            "name": "Flask",
            "category": "Backend Framework",
            "keywords": ["flask"],
            "manifest_keys": ["flask"],
            "sample_files": ["app.py", "wsgi.py"],
        },
        {
            "name": "Django",
            "category": "Backend Framework",
            "keywords": ["django"],
            "manifest_keys": ["django"],
            "sample_files": ["manage.py", "settings.py", "wsgi.py"],
        },
        {
            "name": "React",
            "category": "Frontend Framework",
            "keywords": ["react", "react-dom"],
            "manifest_keys": ["react", "react-dom"],
            "sample_files": ["App.tsx", "App.jsx", "main.tsx", "index.tsx"],
        },
        {
            "name": "Next.js",
            "category": "Fullstack Framework",
            "keywords": ["next"],
            "manifest_keys": ["next"],
            "sample_files": ["next.config.js", "next.config.mjs", "next.config.ts"],
        },
        {
            "name": "Vue",
            "category": "Frontend Framework",
            "keywords": ["vue"],
            "manifest_keys": ["vue"],
            "sample_files": ["App.vue", "main.js", "vite.config.ts"],
        },
        {
            "name": "Express",
            "category": "Backend Framework",
            "keywords": ["express"],
            "manifest_keys": ["express"],
            "sample_files": ["server.js", "app.js", "index.js"],
        },
        {
            "name": "NestJS",
            "category": "Backend Framework",
            "keywords": ["@nestjs/core"],
            "manifest_keys": ["@nestjs/core"],
            "sample_files": ["nest-cli.json", "main.ts"],
        },
        {
            "name": "Pytest",
            "category": "Testing Framework",
            "keywords": ["pytest"],
            "manifest_keys": ["pytest"],
            "sample_files": ["conftest.py", "pytest.ini", "pyproject.toml"],
        },
        {
            "name": "Vitest",
            "category": "Testing Framework",
            "keywords": ["vitest"],
            "manifest_keys": ["vitest"],
            "sample_files": ["vitest.config.ts", "vitest.config.js"],
        },
        {
            "name": "TailwindCSS",
            "category": "CSS Framework",
            "keywords": ["tailwindcss"],
            "manifest_keys": ["tailwindcss"],
            "sample_files": ["tailwind.config.js", "tailwind.config.ts"],
        },
    ]

    for sig in framework_signatures:
        name = sig["name"]
        if name in seen:
            continue

        manifest_hit = any(k in manifest_bundle for k in sig["manifest_keys"])
        file_hit = [f for f in observed_files if any(sf in f for sf in sig["sample_files"])]

        if manifest_hit or file_hit:
            seen.add(name)
            evidence_file = file_hit[0] if file_hit else "dependency manifests"
            classification = "OBSERVED"
            frameworks.append(
                TechnologyDetail(
                    name=name,
                    category=sig["category"],
                    provenance=EvidenceProvenance(
                        source=evidence_file,
                        evidence=f"Identified via {evidence_file} and package manifests",
                        classification=classification,
                        confidence_reason=(
                            f"Direct dependency declaration or config found for {name}"
                        ),
                    ),
                )
            )

    return frameworks


def detect_technologies(
    observed_files: set[str],
    events: list[AnalyzableEvent],
    project_root: str,
) -> list[TechnologyDetail]:
    technologies: list[TechnologyDetail] = []
    seen: set[str] = set()

    manifest_bundle = (
        f"{_safely_read_file_head(project_root, 'package.json')}\n"
        f"{_safely_read_file_head(project_root, 'pyproject.toml')}\n"
        f"{_safely_read_file_head(project_root, 'requirements.txt')}\n"
        f"{_safely_read_file_head(project_root, 'alembic.ini')}\n"
        f"{_safely_read_file_head(project_root, 'docker-compose.yml')}"
    ).lower()

    file_basenames = {pathlib.Path(f).name.lower() for f in observed_files}

    tech_signatures: list[dict[str, Any]] = [
        {
            "name": "PostgreSQL",
            "category": "Relational Database",
            "manifest_keys": [
                "psycopg",
                "asyncpg",
                "postgresql",
                "pg",
                "pgpass",
                "alembic",
                "sqlalchemy",
            ],
            "files": ["alembic.ini", "migrations"],
        },
        {
            "name": "Redis",
            "category": "In-Memory Cache & Message Broker",
            "manifest_keys": ["redis", "ioredis", "aioredis", "redis-py"],
            "files": ["redis.conf"],
        },
        {
            "name": "Docker",
            "category": "Containerization",
            "manifest_keys": ["dockerfile", "docker-compose"],
            "files": ["dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"],
        },
        {
            "name": "WebSockets",
            "category": "Real-Time Protocol",
            "manifest_keys": ["websockets", "ws", "socket.io"],
            "files": ["websocket.py", "ws.ts", "connection_manager.py"],
        },
        {
            "name": "REST API",
            "category": "Communication Architecture",
            "manifest_keys": ["fastapi", "flask", "express", "httpx", "axios"],
            "files": ["router.py", "routes.py", "api.py", "endpoints"],
        },
        {
            "name": "SQLAlchemy",
            "category": "ORM / Persistence",
            "manifest_keys": ["sqlalchemy", "alembic"],
            "files": ["models.py", "database.py"],
        },
    ]

    for sig in tech_signatures:
        name = sig["name"]
        if name in seen:
            continue

        manifest_hit = any(k in manifest_bundle for k in sig["manifest_keys"])
        file_hit = any(f in file_basenames for f in sig["files"]) or any(
            any(k in path.lower() for k in sig["files"]) for path in observed_files
        )

        if manifest_hit or file_hit:
            seen.add(name)
            classification = "OBSERVED" if manifest_hit else "INFERRED"
            technologies.append(
                TechnologyDetail(
                    name=name,
                    category=sig["category"],
                    provenance=EvidenceProvenance(
                        source="configuration & dependencies",
                        evidence=f"Detected via manifest references matching {sig['files']}",
                        classification=classification,
                        confidence_reason=f"Found evidence of {name} in application architecture",
                    ),
                )
            )

    return technologies


def detect_architecture_signals(
    observed_files: set[str],
    events: list[AnalyzableEvent],
    frameworks: list[TechnologyDetail],
    technologies: list[TechnologyDetail],
) -> list[ArchitectureSignalDetail]:
    signals: list[ArchitectureSignalDetail] = []
    files_lower = {f.lower(): f for f in observed_files}

    # 1. Backend Layer
    backend_evidence = [
        orig
        for low, orig in files_lower.items()
        if any(
            t in low
            for t in (
                "app/main.py",
                "src/main.py",
                "server.py",
                "app.py",
                "routes",
                "controllers",
                "services",
            )
        )
    ]
    if backend_evidence or any(
        f.name in ("FastAPI", "Flask", "Django", "Express", "NestJS") for f in frameworks
    ):
        signals.append(
            ArchitectureSignalDetail(
                signal="Backend Application",
                classification="OBSERVED" if backend_evidence else "INFERRED",
                evidence_files=backend_evidence[:5],
                description="Server-side application logic and request processing architecture.",
            )
        )

    # 2. Frontend / UI Layer
    ui_evidence = [
        orig
        for low, orig in files_lower.items()
        if low.endswith((".tsx", ".jsx", ".vue", ".html"))
        or any(t in low for t in ("component", "pages", "src/ui", "views"))
    ]
    if ui_evidence or any(f.name in ("React", "Next.js", "Vue", "Angular") for f in frameworks):
        signals.append(
            ArchitectureSignalDetail(
                signal="Frontend User Interface",
                classification="OBSERVED" if ui_evidence else "INFERRED",
                evidence_files=ui_evidence[:5],
                description="Client-side user interface components and styling system.",
            )
        )

    # 3. Database & Persistence Layer
    db_evidence = [
        orig
        for low, orig in files_lower.items()
        if any(
            t in low for t in ("model", "schema", "alembic", "database", "repository", "entities")
        )
    ]
    if db_evidence or any(
        t.name in ("PostgreSQL", "SQLAlchemy", "MySQL", "MongoDB") for t in technologies
    ):
        signals.append(
            ArchitectureSignalDetail(
                signal="Database & Persistence",
                classification="OBSERVED" if db_evidence else "INFERRED",
                evidence_files=db_evidence[:5],
                description=(
                    "Structured entity models, ORM mappings, and database migration routines."
                ),
            )
        )

    # 4. Authentication & Security
    auth_evidence = [
        orig
        for low, orig in files_lower.items()
        if any(t in low for t in ("auth", "security", "jwt", "token", "password", "crypto"))
    ]
    if auth_evidence:
        signals.append(
            ArchitectureSignalDetail(
                signal="Authentication & Security Subsystem",
                classification="OBSERVED",
                evidence_files=auth_evidence[:5],
                description=(
                    "Identity verification, session handling, or cryptographic security controls."
                ),
            )
        )

    # 5. Automated Verification & QA
    test_evidence = [
        orig
        for low, orig in files_lower.items()
        if "test" in low or "spec" in low or "conftest" in low
    ]
    if test_evidence or any(f.name in ("Pytest", "Vitest", "Jest") for f in frameworks):
        signals.append(
            ArchitectureSignalDetail(
                signal="Automated Verification Suite",
                classification="OBSERVED" if test_evidence else "INFERRED",
                evidence_files=test_evidence[:5],
                description="Automated unit, integration, or end-to-end regression test suites.",
            )
        )

    # 6. Monorepo / Multi-Package Workspace
    is_monorepo = (
        any(
            "pnpm-workspace" in low or "lerna.json" in low or "turbo.json" in low
            for low in files_lower
        )
        or len([f for f in files_lower if f.startswith("apps/") or f.startswith("packages/")]) >= 2
    )
    if is_monorepo:
        monorepo_evidence = [
            orig
            for low, orig in files_lower.items()
            if any(t in low for t in ("pnpm-workspace.yaml", "turbo.json", "packages/", "apps/"))
        ]
        signals.append(
            ArchitectureSignalDetail(
                signal="Monorepo Multi-Package Workspace",
                classification="OBSERVED",
                evidence_files=monorepo_evidence[:5],
                description="Modular repository layout managing multiple coordinated packages.",
            )
        )

    return signals


def detect_git_intelligence(project_root: str) -> GitIntelligenceDetail:
    """
    Safely inspects Git repository metadata without failing on non-git folders
    or when git CLI is not present.
    """
    if not project_root:
        return GitIntelligenceDetail(is_git_repository=False)

    git_bin = shutil.which("git") or "git"

    try:
        rev_res = subprocess.run(  # noqa: S603
            [git_bin, "rev-parse", "--is-inside-work-tree"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if rev_res.returncode != 0 or rev_res.stdout.strip() != "true":
            return GitIntelligenceDetail(
                is_git_repository=False,
                provenance="OBSERVED FROM FILESYSTEM (.git directory not found)",
            )

        branch: str | None = None
        commit_hash: str | None = None
        commit_time: str | None = None
        uncommitted_changes = 0

        branch_res = subprocess.run(  # noqa: S603
            [git_bin, "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if branch_res.returncode == 0:
            branch = branch_res.stdout.strip()

        log_res = subprocess.run(  # noqa: S603
            [git_bin, "log", "-1", "--format=%H|%cI"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if log_res.returncode == 0 and log_res.stdout.strip():
            parts = log_res.stdout.strip().split("|")
            if len(parts) >= 1:
                commit_hash = parts[0]
            if len(parts) >= 2:
                commit_time = parts[1]

        status_res = subprocess.run(  # noqa: S603
            [git_bin, "status", "--porcelain"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if status_res.returncode == 0:
            lines = [line for line in status_res.stdout.splitlines() if line.strip()]
            uncommitted_changes = len(lines)

        return GitIntelligenceDetail(
            is_git_repository=True,
            branch=branch,
            latest_commit_hash=commit_hash,
            latest_commit_timestamp=commit_time,
            uncommitted_changes_count=uncommitted_changes,
            provenance="OBSERVED FROM GIT REPOSITORY (.git metadata)",
        )
    except Exception:
        return GitIntelligenceDetail(
            is_git_repository=False,
            provenance="OBSERVED FROM FILESYSTEM (git unavailable)",
        )


def compute_activity_heatmap(events: list[AnalyzableEvent]) -> list[ActivityHeatmapCell]:
    matrix: dict[tuple[int, int], int] = {}

    for ev in events:
        if ev.timestamp:
            ts = ev.timestamp
            day = ts.weekday()
            hour = ts.hour
            matrix[(day, hour)] = matrix.get((day, hour), 0) + 1

    cells: list[ActivityHeatmapCell] = []
    for day in range(7):
        for hour in range(24):
            count = matrix.get((day, hour), 0)
            if count > 0:
                cells.append(
                    ActivityHeatmapCell(day_of_week=day, hour_of_day=hour, event_count=count)
                )

    return cells


def determine_development_focus(
    events: list[AnalyzableEvent],
    window_days: int = 7,
) -> DevelopmentFocusDetail:
    if len(events) < 3:
        return DevelopmentFocusDetail(
            focus="Insufficient History",
            classification="UNKNOWN",
            confidence_reason=(
                "Insufficient observed history to determine focus (min 3 events required)."
            ),
            evidence_summary=[],
            active_window=f"Last {window_days} days",
        )

    cutoff = datetime.now(tz=UTC) - timedelta(days=window_days)
    recent_events = [e for e in events if e.timestamp and e.timestamp >= cutoff]
    target_pool = recent_events if len(recent_events) >= 3 else events

    category_counts: dict[str, int] = {}
    category_evidence: dict[str, list[str]] = {}

    for ev in target_pool:
        f_low = (ev.file_path or "").lower()
        cat = "General Maintenance"

        if any(t in f_low for t in ("auth", "security", "jwt", "token")):
            cat = "Authentication & Security"
        elif any(t in f_low for t in ("test", "spec", "conftest")):
            cat = "Testing & Quality Assurance"
        elif any(t in f_low for t in ("api", "router", "route", "controller", "endpoint")):
            cat = "API Development"
        elif any(t in f_low for t in ("model", "schema", "alembic", "database", "sql")):
            cat = "Database & Persistence"
        elif any(f_low.endswith(ext) for ext in (".tsx", ".jsx", ".css", ".scss", ".html")):
            cat = "Frontend & UI Design"
        elif any(t in f_low for t in ("doc", "readme", ".md")):
            cat = "Documentation"
        elif any(
            t in f_low for t in ("config", ".env", "docker", "package.json", "pyproject.toml")
        ):
            cat = "Configuration & Build Tooling"

        category_counts[cat] = category_counts.get(cat, 0) + 1
        if ev.file_name and ev.file_name not in category_evidence.get(cat, []):
            category_evidence.setdefault(cat, []).append(ev.file_name)

    top_cat = max(category_counts.items(), key=lambda x: x[1])
    sample_files = category_evidence.get(top_cat[0], [])[:4]
    pct = round(top_cat[1] / len(target_pool) * 100)

    return DevelopmentFocusDetail(
        focus=top_cat[0],
        classification="INFERRED",
        confidence_reason=(
            f"Concentration of {top_cat[1]} events in '{top_cat[0]}' "
            f"({pct}% of activity) touching {sample_files}"
        ),
        evidence_summary=[
            f"{fname} ({category_counts[top_cat[0]]} events)" for fname in sample_files
        ],
        active_window=f"Last {window_days} days ({len(target_pool)} events analyzed)",
    )


def rank_file_activity(
    events: list[AnalyzableEvent],
    limit: int = 15,
) -> list[FileActivityRanking]:
    file_map: dict[str, dict[str, Any]] = {}

    for ev in events:
        path = ev.file_path or ev.file_name or "unknown"
        if path == "unknown":
            continue

        if path not in file_map:
            file_map[path] = {
                "file_path": path,
                "event_count": 0,
                "event_types": {},
                "last_active": ev.timestamp,
            }

        entry = file_map[path]
        entry["event_count"] += 1
        etype = ev.event_type
        entry["event_types"][etype] = entry["event_types"].get(etype, 0) + 1
        if ev.timestamp and (entry["last_active"] is None or ev.timestamp > entry["last_active"]):
            entry["last_active"] = ev.timestamp

    ranked = sorted(file_map.values(), key=lambda x: -x["event_count"])[:limit]

    return [
        FileActivityRanking(
            file_path=r["file_path"],
            event_count=r["event_count"],
            event_types_breakdown=r["event_types"],
            last_observed_at=r["last_active"],
        )
        for r in ranked
    ]
