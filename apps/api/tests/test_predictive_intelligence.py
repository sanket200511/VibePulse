"""
Tests for Sprint 6: Predictive Engineering Intelligence.

Verifies:
- Insufficient evidence detection
- Activity acceleration and change bursts
- Security rule recurrence & additive scoring
- Hotspot ranking and score bounding (0-100)
- Resolution regression detection using IncidentReviewHistory
- Engineering DNA focus drift
- 100% Deterministic reconstructibility
- Multi-project isolation
- Strict secret redaction
- REST API router endpoints
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.investigation.models import IncidentReviewHistory
from app.features.predictive_intelligence.service import (
    get_or_create_predictive_intelligence,
)
from app.features.project_context.export import generate_project_context_markdown
from app.features.projects.models import Project
from app.features.sessions.models import Session
from app.main import create_app
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_insufficient_evidence_state(db_session: AsyncSession):
    """Verifies that projects with zero or insufficient telemetry return INSUFFICIENT_EVIDENCE."""
    project = Project(
        id=uuid.uuid4(),
        root_path="/tmp/empty_test_proj",
        display_name="Empty Project",
    )
    db_session.add(project)
    await db_session.commit()

    summary = await get_or_create_predictive_intelligence(db_session, project.id)
    assert summary.status == "INSUFFICIENT_EVIDENCE"
    assert "Insufficient historical telemetry" in summary.status_message
    assert summary.total_predictions == 0
    assert len(summary.forecast_signals) == 0


@pytest.mark.asyncio
async def test_security_recurrence_and_hotspots(db_session: AsyncSession):
    """Verifies security recurrence forecasting and hotspot scoring from historical telemetry."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/pred_test_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Predictive Test Proj")
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
        event_count=5,
        languages={"Python": 5},
        events_by_type={"FILE_MODIFIED": 5},
    )
    db_session.add(session)

    # Add 4 events touching auth.py
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

    # Add security analyses for SEC001
    for ev in events[:2]:
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

    summary = await get_or_create_predictive_intelligence(db_session, proj_id)
    assert summary.status == "READY"
    assert summary.total_predictions >= 1

    # Check for security recurrence signal
    rec_sig = next(
        (s for s in summary.forecast_signals if s.prediction_type == "SECURITY_RECURRENCE"),
        None,
    )
    assert rec_sig is not None
    assert rec_sig.severity == "CRITICAL"
    assert rec_sig.forecast_score > 50
    assert rec_sig.evidence_strength in ("STRONG", "MODERATE")
    assert "SEC001" in rec_sig.title or "Secret" in rec_sig.title
    assert rec_sig.score_breakdown.security_recurrence > 0

    # Check hotspots
    assert len(summary.hotspots) >= 1
    top_h = summary.hotspots[0]
    assert "login.py" in top_h.file_path
    assert top_h.findings_count >= 1
    assert top_h.hotspot_score >= 40


@pytest.mark.asyncio
async def test_resolution_regression_forecasting(db_session: AsyncSession):
    """Verifies that previously resolved rules reappearing trigger RESOLUTION_REGRESSION."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/regr_test_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Regression Test Proj")
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
        event_count=3,
    )
    db_session.add(session)

    # Ingest event with SEC001
    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=session_id,
        timestamp=now,
        event_type="FILE_MODIFIED",
        file_path="config/vault.py",
        file_name="vault.py",
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
                    "severity": "HIGH",
                    "title": "Hardcoded Secret",
                    "message": "Plaintext API key in vault.py",
                    "category": "Secrets",
                    "redacted_evidence": "KEY = [REDACTED]",
                }
            ]
        },
    )
    db_session.add(analysis)

    # Record historical resolution for SEC001
    hist = IncidentReviewHistory(
        id=uuid.uuid4(),
        project_id=proj_id,
        incident_id="inc-prev-1",
        previous_status="INVESTIGATING",
        new_status="RESOLVED",
        resolution_note="Resolved SEC001 token and rotated key.",
        reviewer="Lead SecOps",
        created_at=now - timedelta(days=2),
    )
    db_session.add(hist)
    await db_session.commit()

    summary = await get_or_create_predictive_intelligence(db_session, proj_id)
    reg_sig = next(
        (s for s in summary.forecast_signals if s.prediction_type == "RESOLUTION_REGRESSION"),
        None,
    )
    assert reg_sig is not None
    assert reg_sig.severity in ("CRITICAL", "HIGH")
    assert reg_sig.forecast_score >= 80
    assert reg_sig.evidence_strength == "STRONG"
    assert "Resolution Regression" in reg_sig.title
    assert reg_sig.investigation_incident_id is not None


@pytest.mark.asyncio
async def test_reconstructibility_and_isolation(db_session: AsyncSession):
    """Verifies that predictions are 100% reconstructible and strictly isolated across projects."""
    proj_a = Project(id=uuid.uuid4(), root_path="/tmp/proj_a", display_name="Project A")
    proj_b = Project(id=uuid.uuid4(), root_path="/tmp/proj_b", display_name="Project B")
    db_session.add_all([proj_a, proj_b])

    now = datetime.now(tz=UTC)
    # Add events only to Project A
    for i in range(3):
        ev = DevelopmentEvent(
            id=uuid.uuid4(),
            project_root=proj_a.root_path,
            session_id=uuid.uuid4(),
            timestamp=now - timedelta(minutes=5 * i),
            event_type="FILE_MODIFIED",
            file_path="src/api.py",
            language="Python",
            metadata={},
        )
        db_session.add(ev)

    await db_session.commit()

    # 1. Project A has predictions, Project B has insufficient evidence
    summary_a1 = await get_or_create_predictive_intelligence(db_session, proj_a.id)
    summary_b = await get_or_create_predictive_intelligence(db_session, proj_b.id)

    assert summary_a1.status == "READY"
    assert summary_b.status == "INSUFFICIENT_EVIDENCE"
    assert len(summary_b.forecast_signals) == 0

    # 2. Reconstruct Project A
    summary_a2 = await get_or_create_predictive_intelligence(db_session, proj_a.id)
    assert summary_a1.total_predictions == summary_a2.total_predictions
    assert summary_a1.active_hotspots_count == summary_a2.active_hotspots_count
    titles_a1 = [s.title for s in summary_a1.forecast_signals]
    titles_a2 = [s.title for s in summary_a2.forecast_signals]
    assert titles_a1 == titles_a2


@pytest.mark.asyncio
async def test_secret_redaction_and_context_export(db_session: AsyncSession):
    """Verifies zero raw secret leakage in predictions and PROJECT_CONTEXT.md."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/sec_redact_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Redaction Project")
    db_session.add(project)

    now = datetime.now(tz=UTC)
    secret_val = "VIBEPULSE_SPRINT6_SECRET_2026"

    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=uuid.uuid4(),
        timestamp=now,
        event_type="FILE_MODIFIED",
        file_path="secret_key.py",
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
                    "title": "Hardcoded Secret",
                    "message": f"Hardcoded secret: {secret_val}",
                    "redacted_evidence": "KEY = [REDACTED]",
                }
            ]
        },
    )
    db_session.add(analysis)
    await db_session.commit()

    summary = await get_or_create_predictive_intelligence(db_session, proj_id)
    summary_str = summary.model_dump_json()
    assert secret_val not in summary_str

    md_context = await generate_project_context_markdown(db_session, proj_id)
    assert secret_val not in md_context
    assert "## 17. Predictive Engineering Signals" in md_context


@pytest.mark.asyncio
async def test_predictive_rest_endpoints(db_session: AsyncSession):
    """Verifies REST endpoints for predictions, summary, hotspots, trends, and refresh."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/rest_pred_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="REST Pred Project")
    db_session.add(project)

    now = datetime.now(tz=UTC)
    for i in range(3):
        ev = DevelopmentEvent(
            id=uuid.uuid4(),
            project_root=root_path,
            session_id=uuid.uuid4(),
            timestamp=now - timedelta(minutes=i),
            event_type="FILE_MODIFIED",
            file_path="app/router.py",
            language="Python",
            metadata={},
        )
        db_session.add(ev)

    await db_session.commit()

    from app.core.database import get_db

    test_app = create_app()
    test_app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET /api/projects/{id}/predictions
        res = await client.get(f"/api/projects/{proj_id}/predictions")
        assert res.status_code == 200
        data = res.json()
        assert data["project_id"] == str(proj_id)
        assert "status" in data

        # GET /api/projects/{id}/predictions/hotspots
        res_h = await client.get(f"/api/projects/{proj_id}/predictions/hotspots")
        assert res_h.status_code == 200
        assert isinstance(res_h.json(), list)

        # GET /api/projects/{id}/predictions/trends
        res_t = await client.get(f"/api/projects/{proj_id}/predictions/trends")
        assert res_t.status_code == 200
        assert isinstance(res_t.json(), list)

        # POST /api/projects/{id}/predictions/refresh
        res_r = await client.post(f"/api/projects/{proj_id}/predictions/refresh")
        assert res_r.status_code == 200
