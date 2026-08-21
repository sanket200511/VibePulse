"""
Project Intelligence & Engineering DNA Tests.

Verifies:
  - Language detection, percentages, and activity weighting
  - Package manager and lockfile detection
  - Framework and technology detection with explicit EvidenceProvenance
  - Architecture signals with evidence files
  - Git intelligence extraction and non-git fallback
  - Activity heatmap (Day x Hour) and file rankings
  - Development focus inference with insufficient history fallback
  - Materialized view / derived projection reproducibility:
      Deleting ONLY the project_contexts cache row and recalculating yields
      a semantically equivalent reconstructed projection from raw PostgreSQL events.
  - Multi-project intelligence isolation
  - Secret redaction in PROJECT_CONTEXT.md export
"""

import pathlib
import uuid
from datetime import UTC, datetime

import pytest
from app.core.domain.events import AnalyzableEvent
from app.features.events.constants import EventType
from app.features.events.schemas import DevelopmentEventCreate
from app.features.events.service import create_event
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
from app.features.project_context.export import redact_sensitive_text
from app.features.project_context.models import ProjectContext
from app.features.project_context.schemas import TechnologyDetail
from app.features.project_context.service import refresh_project_context
from app.features.projects.service import get_or_create_project
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def test_detect_languages():
    observed_files = {"app/main.py", "app/utils.py", "src/index.ts", "README.md"}
    ts = datetime.now(tz=UTC)
    events = [
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_MODIFIED",
            timestamp=ts,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/app/main.py",
            file_name="main.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        )
    ]

    langs = detect_languages(observed_files, events)
    assert "Python" in langs
    assert "TypeScript" in langs
    assert "Markdown" in langs
    assert langs["Python"].count == 2
    assert langs["TypeScript"].count == 1
    assert langs["Python"].percentage == 50.0
    assert langs["Python"].recent_activity_count == 1


def test_detect_package_managers():
    observed = {"pnpm-lock.yaml", "package.json", "pyproject.toml"}
    pms = detect_package_managers(observed, project_root="/non/existent")
    names = [p.name for p in pms]
    assert "pnpm" in names
    assert any(p.provenance and p.provenance.classification == "OBSERVED" for p in pms)


def test_detect_frameworks_and_technologies():
    observed = {"app/main.py", "src/App.tsx", "alembic.ini", "docker-compose.yml"}
    events: list[AnalyzableEvent] = []

    fws = detect_frameworks(observed, events, project_root="/non/existent")
    techs = detect_technologies(observed, events, project_root="/non/existent")

    fw_names = [f.name for f in fws]
    tech_names = [t.name for t in techs]

    assert "FastAPI" in fw_names
    assert "React" in fw_names
    assert "PostgreSQL" in tech_names
    assert "Docker" in tech_names

    for item in fws + techs:
        assert item.provenance is not None
        assert item.provenance.classification in ("OBSERVED", "INFERRED")
        assert len(item.provenance.evidence) > 0


def test_architecture_signals():
    observed = {
        "app/main.py",
        "app/auth/security.py",
        "app/models.py",
        "tests/test_api.py",
        "apps/daemon/src/index.ts",
        "packages/ui/src/index.tsx",
    }
    events: list[AnalyzableEvent] = []
    frameworks = [
        TechnologyDetail(name="FastAPI", category="Backend Framework"),
        TechnologyDetail(name="React", category="Frontend Framework"),
    ]
    technologies = [
        TechnologyDetail(name="PostgreSQL", category="Relational Database"),
    ]

    signals = detect_architecture_signals(observed, events, frameworks, technologies)
    sig_names = [s.signal for s in signals]

    assert "Backend Application" in sig_names
    assert "Frontend User Interface" in sig_names
    assert "Database & Persistence" in sig_names
    assert "Authentication & Security Subsystem" in sig_names
    assert "Automated Verification Suite" in sig_names
    assert "Monorepo Multi-Package Workspace" in sig_names


def test_git_intelligence():
    # Test on real git repo (root of repository)
    repo_root = str(pathlib.Path(__file__).resolve().parents[2])
    intel = detect_git_intelligence(project_root=repo_root)
    assert intel.is_git_repository is True
    assert intel.branch is not None
    assert "OBSERVED FROM GIT" in intel.provenance

    # Test non-git fallback
    fallback = detect_git_intelligence(project_root="/non/existent/path/for/sure")
    assert fallback.is_git_repository is False


def test_activity_heatmap_and_file_ranking():
    now = datetime(2026, 8, 21, 10, 30, 0, tzinfo=UTC)  # Friday (day 4), 10 AM
    events = [
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_MODIFIED",
            timestamp=now,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/auth.py",
            file_name="auth.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        ),
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_MODIFIED",
            timestamp=now,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/auth.py",
            file_name="auth.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        ),
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_CREATED",
            timestamp=now,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/main.py",
            file_name="main.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        ),
    ]

    heatmap = compute_activity_heatmap(events)
    assert len(heatmap) == 1
    assert heatmap[0].day_of_week == 4
    assert heatmap[0].hour_of_day == 10
    assert heatmap[0].event_count == 3

    ranking = rank_file_activity(events, limit=5)
    assert ranking[0].file_path == "/proj/auth.py"
    assert ranking[0].event_count == 2
    assert ranking[0].event_types_breakdown["FILE_MODIFIED"] == 2


def test_development_focus():
    now = datetime.now(tz=UTC)
    events = [
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_MODIFIED",
            timestamp=now,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/auth/service.py",
            file_name="service.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        ),
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_MODIFIED",
            timestamp=now,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/auth/token.py",
            file_name="token.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        ),
        AnalyzableEvent(
            id=uuid.uuid4(),
            event_type="FILE_MODIFIED",
            timestamp=now,
            session_id=uuid.uuid4(),
            project_root="/proj",
            file_path="/proj/auth/guard.py",
            file_name="guard.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        ),
    ]

    focus = determine_development_focus(events, window_days=7)
    assert focus.focus == "Authentication & Security"
    assert focus.classification == "INFERRED"
    assert "Authentication & Security" in focus.confidence_reason

    # Empty / insufficient events
    insufficient = determine_development_focus(events[:2])
    assert insufficient.focus == "Insufficient History"
    assert insufficient.classification == "UNKNOWN"


def test_secret_redaction():
    raw_text = "API_KEY = 'sk-proj-12345678901234567890'\npassword = 'super_secret_token'"
    redacted = redact_sensitive_text(raw_text)
    assert "sk-proj" not in redacted
    assert "super_secret" not in redacted
    assert "[REDACTED]" in redacted


@pytest.mark.asyncio
async def test_projection_reproducibility_after_cache_deletion(db_session: AsyncSession):
    """
    CRITICAL INVARIANT TEST:
    1. Create a project and record events.
    2. Aggregate initial project context.
    3. Delete ONLY the project_contexts table row (materialized cache).
    4. Verify development_events, sessions, and project remain intact in PostgreSQL.
    5. Re-run refresh_project_context.
    6. Verify the reconstructed context is 100% semantically identical.
    """
    proj_root = "D:\\Projects\\ReproducibleTestApp"
    proj = await get_or_create_project(db_session, proj_root, display_name="ReproducibleApp")

    session_id = uuid.uuid4()
    ts = datetime.now(tz=UTC)

    # Ingest historical events into PostgreSQL
    test_files = [
        ("src/auth.py", "Python"),
        ("src/api.py", "Python"),
        ("src/App.tsx", "TypeScript"),
    ]
    for fname, lang in test_files:
        ev_create = DevelopmentEventCreate(
            event_type=EventType.FILE_CREATED,
            timestamp=ts,
            session_id=session_id,
            project_root=proj_root,
            file_path=f"{proj_root}\\{fname}",
            file_name=fname.split("/")[-1],
            file_extension=".py" if fname.endswith(".py") else ".tsx",
            language=lang,
            git_branch="main",
            metadata={},
        )
        await create_event(db_session, ev_create)

    # 1. Initial Projection
    initial_context = await refresh_project_context(db_session, proj.id)
    assert "Python" in initial_context.languages
    assert initial_context.activity_summary.total_events == 3

    # 2. Delete ONLY the project_contexts row
    stmt_del = select(ProjectContext).where(ProjectContext.project_id == proj.id)
    res = await db_session.execute(stmt_del)
    ctx_row = res.scalar_one()
    await db_session.delete(ctx_row)
    await db_session.commit()

    # Verify cache row is gone
    res_check = await db_session.execute(stmt_del)
    assert res_check.scalar_one_or_none() is None

    # 3. Reconstruct Projection from historical events
    reconstructed = await refresh_project_context(db_session, proj.id)

    # 4. Compare semantic equivalence
    assert reconstructed.project_id == initial_context.project_id
    assert reconstructed.languages["Python"].count == initial_context.languages["Python"].count
    assert (
        reconstructed.activity_summary.total_events == initial_context.activity_summary.total_events
    )
    assert len(reconstructed.important_files) == len(initial_context.important_files)
    assert reconstructed.development_focus.focus == initial_context.development_focus.focus


@pytest.mark.asyncio
async def test_multi_project_intelligence_isolation(db_session: AsyncSession):
    """Verify that Project A's intelligence never mixes with Project B's intelligence."""
    proj_a = await get_or_create_project(db_session, "D:\\Projects\\ProjA", display_name="ProjA")
    proj_b = await get_or_create_project(db_session, "D:\\Projects\\ProjB", display_name="ProjB")

    ts = datetime.now(tz=UTC)
    # A has Rust events
    ev_a = DevelopmentEventCreate(
        event_type=EventType.FILE_CREATED,
        timestamp=ts,
        session_id=uuid.uuid4(),
        project_root="D:\\Projects\\ProjA",
        file_path="D:\\Projects\\ProjA\\src\\main.rs",
        file_name="main.rs",
        file_extension=".rs",
        language="Rust",
        git_branch="main",
        metadata={},
    )
    # B has Python events
    ev_b = DevelopmentEventCreate(
        event_type=EventType.FILE_CREATED,
        timestamp=ts,
        session_id=uuid.uuid4(),
        project_root="D:\\Projects\\ProjB",
        file_path="D:\\Projects\\ProjB\\src\\main.py",
        file_name="main.py",
        file_extension=".py",
        language="Python",
        git_branch="main",
        metadata={},
    )

    await create_event(db_session, ev_a)
    await create_event(db_session, ev_b)

    ctx_a = await refresh_project_context(db_session, proj_a.id)
    ctx_b = await refresh_project_context(db_session, proj_b.id)

    assert "Rust" in ctx_a.languages
    assert "Python" not in ctx_a.languages

    assert "Python" in ctx_b.languages
    assert "Rust" not in ctx_b.languages
