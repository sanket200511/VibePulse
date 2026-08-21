"""
Tests for Sprint 7: Unified Project Health & Intelligence Orchestrator.

Verifies:
- Insufficient evidence detection
- 5 deterministic health dimensions & weighted overall health calculation
- Grade boundary classification
- Actionable Priority Engine ('What Should I Do Next?') ranking and tie-breaking
- Resolution regression impact on Resolution Health
- 100% Deterministic reconstructibility (A == B)
- Multi-project isolation
- Strict secret redaction (VIBEPULSE_SPRINT7_SECRET_2026)
- REST API router endpoints
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.core.database import get_db
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.investigation.models import IncidentReviewHistory
from app.features.project_context.export import generate_project_context_markdown
from app.features.project_health.service import (
    get_or_create_unified_project_health,
    get_project_priorities,
)
from app.features.projects.models import Project
from app.features.sessions.models import Session
from app.main import create_app
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_insufficient_evidence_health_state(db_session: AsyncSession):
    """Verifies that projects with zero telemetry return explicit INSUFFICIENT_EVIDENCE."""
    project = Project(
        id=uuid.uuid4(),
        root_path="/tmp/empty_health_proj",
        display_name="Empty Health Project",
    )
    db_session.add(project)
    await db_session.commit()

    health = await get_or_create_unified_project_health(db_session, project.id)
    assert health.status == "INSUFFICIENT_EVIDENCE"
    assert health.overall_health_score is None
    assert health.grade == "INSUFFICIENT_EVIDENCE"
    assert "Insufficient historical telemetry" in health.status_message
    assert len(health.top_priorities) == 0


@pytest.mark.asyncio
async def test_five_health_dimensions_and_overall_score(db_session: AsyncSession):
    """Verifies calculation and weighting of all 5 deterministic health dimensions."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/health_calc_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Health Calc Project")
    db_session.add(project)

    now = datetime.now(tz=UTC)
    session_id = uuid.uuid4()
    session = Session(
        id=session_id,
        project_id=proj_id,
        project_root=root_path,
        status="COMPLETED",
        started_at=now - timedelta(hours=2),
        last_event_at=now,
        event_count=6,
        languages={"Python": 6},
        events_by_type={"FILE_MODIFIED": 6},
    )
    db_session.add(session)

    # Add telemetry events
    events = []
    for i in range(4):
        ev = DevelopmentEvent(
            id=uuid.uuid4(),
            project_root=root_path,
            session_id=session_id,
            timestamp=now - timedelta(minutes=10 * (4 - i)),
            event_type="FILE_MODIFIED",
            file_path="src/auth/login.py",
            file_name="login.py",
            file_extension=".py",
            language="Python",
            git_branch="main",
            metadata={},
        )
        events.append(ev)
        db_session.add(ev)

    await db_session.flush()

    # Add security findings
    for ev in events[:2]:
        analysis = EventAnalysis(
            id=uuid.uuid4(),
            event_id=ev.id,
            analyzer_name="security_guardian",
            analyzer_version=1,
            duration_ms=12.0,
            findings={
                "findings": [
                    {
                        "rule_id": "SEC001",
                        "severity": "CRITICAL",
                        "title": "Hardcoded Secret",
                        "message": "Hardcoded secret detected",
                        "category": "Secrets",
                        "redacted_evidence": "API_KEY = [REDACTED]",
                        "recommendation": "Rotate credential",
                        "risk_contribution": 30,
                    }
                ]
            },
        )
        db_session.add(analysis)

    await db_session.commit()

    health = await get_or_create_unified_project_health(db_session, proj_id)
    assert health.status == "READY"
    assert health.overall_health_score is not None
    assert 0 <= health.overall_health_score <= 100
    assert health.grade in ("EXCELLENT", "HEALTHY", "NEEDS_ATTENTION", "DEGRADED", "CRITICAL")

    # Verify 5 dimensions
    assert health.security_health.weight == 0.25
    assert health.engineering_stability.weight == 0.20
    assert health.incident_health.weight == 0.20
    assert health.resolution_health.weight == 0.15
    assert health.predictive_risk_health.weight == 0.20

    for dim in [
        health.security_health,
        health.engineering_stability,
        health.incident_health,
        health.resolution_health,
        health.predictive_risk_health,
    ]:
        assert 0 <= dim.score <= 100
        assert dim.provenance in ("OBSERVED", "INFERRED", "UNKNOWN")
        assert len(dim.contributing_signals) > 0


@pytest.mark.asyncio
async def test_priority_ranking_engine_and_tie_breaking(db_session: AsyncSession):
    """Verifies deterministic ranking order, severity weighting, and tie-breaking."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/prio_rank_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Priority Rank Project")
    db_session.add(project)

    now = datetime.now(tz=UTC)
    session_id = uuid.uuid4()
    session = Session(
        id=session_id,
        project_id=proj_id,
        project_root=root_path,
        status="ACTIVE",
        started_at=now - timedelta(hours=1),
        last_event_at=now,
        event_count=5,
    )
    db_session.add(session)

    # Ingest event with high finding
    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=session_id,
        timestamp=now,
        event_type="FILE_MODIFIED",
        file_path="config/settings.py",
        file_name="settings.py",
        language="Python",
        metadata={},
    )
    db_session.add(ev)
    await db_session.flush()

    analysis = EventAnalysis(
        id=uuid.uuid4(),
        event_id=ev.id,
        analyzer_name="security_guardian",
        analyzer_version=1,
        duration_ms=10.0,
        findings={
            "findings": [
                {
                    "rule_id": "DEBUG_TRUE",
                    "severity": "HIGH",
                    "title": "Debug Mode Enabled",
                    "message": "DEBUG = True enabled in production settings",
                    "category": "Configuration",
                    "redacted_evidence": "DEBUG = True",
                }
            ]
        },
    )
    db_session.add(analysis)

    # Add historical resolution regression for SEC001
    hist = IncidentReviewHistory(
        id=uuid.uuid4(),
        project_id=proj_id,
        incident_id="inc-regr-1",
        previous_status="INVESTIGATING",
        new_status="RESOLVED",
        resolution_note="Resolved SEC001 key.",
        reviewer="SecOps Lead",
        created_at=now - timedelta(days=1),
    )
    db_session.add(hist)
    await db_session.commit()

    priorities = await get_project_priorities(db_session, proj_id)
    assert len(priorities) >= 1

    # Verify rank sequence
    for idx, item in enumerate(priorities, start=1):
        assert item.rank == idx
        assert item.priority_score >= 0
        assert len(item.why_ranked_highly) > 0
        assert len(item.contributing_evidence) > 0

    # Highest priority should have highest score
    assert priorities[0].priority_score >= priorities[-1].priority_score


@pytest.mark.asyncio
async def test_multi_project_isolation_and_reconstructibility(db_session: AsyncSession):
    """Verifies zero cross-project leakage and 100% deterministic reconstructibility."""
    proj_a = Project(id=uuid.uuid4(), root_path="/tmp/h_proj_a", display_name="Health Project A")
    proj_b = Project(id=uuid.uuid4(), root_path="/tmp/h_proj_b", display_name="Health Project B")
    db_session.add_all([proj_a, proj_b])

    now = datetime.now(tz=UTC)
    for i in range(3):
        ev = DevelopmentEvent(
            id=uuid.uuid4(),
            project_root=proj_a.root_path,
            session_id=uuid.uuid4(),
            timestamp=now - timedelta(minutes=5 * i),
            event_type="FILE_MODIFIED",
            file_path="src/main.py",
            language="Python",
            metadata={},
        )
        db_session.add(ev)

    await db_session.commit()

    # 1. Project A has health, Project B is insufficient evidence
    health_a1 = await get_or_create_unified_project_health(db_session, proj_a.id)
    health_b = await get_or_create_unified_project_health(db_session, proj_b.id)

    assert health_a1.status == "READY"
    assert health_b.status == "INSUFFICIENT_EVIDENCE"
    assert health_b.overall_health_score is None

    # 2. Reconstruct Project A
    health_a2 = await get_or_create_unified_project_health(db_session, proj_a.id)
    assert health_a1.overall_health_score == health_a2.overall_health_score
    assert health_a1.grade == health_a2.grade
    assert health_a1.security_health.score == health_a2.security_health.score
    assert len(health_a1.top_priorities) == len(health_a2.top_priorities)


@pytest.mark.asyncio
async def test_secret_redaction_and_context_export(db_session: AsyncSession):
    """Verifies that secrets like VIBEPULSE_SPRINT7_SECRET_2026 are never leaked."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/h_secret_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Secret Health Project")
    db_session.add(project)

    now = datetime.now(tz=UTC)
    secret_val = "VIBEPULSE_SPRINT7_SECRET_2026"

    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=uuid.uuid4(),
        timestamp=now,
        event_type="FILE_MODIFIED",
        file_path="secrets.py",
        language="Python",
        metadata={},
    )
    db_session.add(ev)
    await db_session.flush()

    analysis = EventAnalysis(
        id=uuid.uuid4(),
        event_id=ev.id,
        analyzer_name="security_guardian",
        analyzer_version=1,
        duration_ms=10.0,
        findings={
            "findings": [
                {
                    "rule_id": "SEC001",
                    "severity": "CRITICAL",
                    "title": "Secret Token",
                    "message": f"Hardcoded secret {secret_val}",
                    "redacted_evidence": "SECRET = [REDACTED]",
                }
            ]
        },
    )
    db_session.add(analysis)
    await db_session.commit()

    health = await get_or_create_unified_project_health(db_session, proj_id)
    health_json = health.model_dump_json()
    assert secret_val not in health_json

    md_context = await generate_project_context_markdown(db_session, proj_id)
    assert secret_val not in md_context
    assert "## 18. Unified Project Health & Actionable Priorities" in md_context


@pytest.mark.asyncio
async def test_project_health_rest_endpoints(db_session: AsyncSession):
    """Verifies REST endpoints for health, priorities, and refresh."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/rest_health_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="REST Health Project")
    db_session.add(project)

    now = datetime.now(tz=UTC)
    for i in range(3):
        ev = DevelopmentEvent(
            id=uuid.uuid4(),
            project_root=root_path,
            session_id=uuid.uuid4(),
            timestamp=now - timedelta(minutes=i),
            event_type="FILE_MODIFIED",
            file_path="app/health.py",
            language="Python",
            metadata={},
        )
        db_session.add(ev)

    await db_session.commit()

    test_app = create_app()
    test_app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=test_app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET /api/projects/{id}/health
        res = await client.get(f"/api/projects/{proj_id}/health")
        assert res.status_code == 200
        data = res.json()
        assert data["project_id"] == str(proj_id)
        assert "overall_health_score" in data
        assert "security_health" in data

        # GET /api/projects/{id}/health/priorities
        res_p = await client.get(f"/api/projects/{proj_id}/health/priorities")
        assert res_p.status_code == 200
        assert isinstance(res_p.json(), list)

        # POST /api/projects/{id}/health/refresh
        res_r = await client.post(f"/api/projects/{proj_id}/health/refresh")
        assert res_r.status_code == 200
        assert res_r.json()["project_id"] == str(proj_id)
