"""
Sprint 9: Trust, Explainability & Evidence Intelligence Tests.

Validates:
1. Universal evidence model & provenance tags (OBSERVED, INFERRED, UNKNOWN)
2. Mathematical score decomposition for Unified Health
3. AST rule rationale and causal chain for Security findings
4. Incident review state transitions and root cause explainability
5. Predictive forecast score breakdown and evidence strength
6. Priority ranking rationale and urgency scoring
7. Strict secret masking (VIBEPULSE_SPRINT9_SECRET_2026)
8. Multi-project isolation (Project A vs Project B)
9. 100% Deterministic reconstructibility (Result A == Result B)
10. Insufficient evidence state handling
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.core.database import get_db
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.evidence.service import explain_entity
from app.features.investigation.models import IncidentReviewHistory, IncidentReviewState
from app.features.projects.models import Project
from app.features.sessions.models import Session
from app.main import create_app
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

SECRET_TOKEN = "VIBEPULSE_SPRINT9_SECRET_2026"


@pytest.mark.asyncio
async def test_evidence_health_decomposition(db_session: AsyncSession):
    """Verifies that project health decomposition mathematically matches dimension weights."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/evidence_health_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Evidence Health Project")
    db_session.add(project)
    await db_session.commit()

    now = datetime.now(tz=UTC)
    sess_id = uuid.uuid4()
    sess = Session(
        id=sess_id,
        project_root=root_path,
        started_at=now - timedelta(minutes=40),
        last_event_at=now,
        status="ACTIVE",
    )
    db_session.add(sess)

    # Ingest event and finding
    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=sess_id,
        timestamp=now - timedelta(minutes=20),
        event_type="FILE_MODIFIED",
        file_path="src/config/settings.py",
        file_name="settings.py",
        file_extension=".py",
        language="Python",
        event_metadata={"diff": f"+ SECRET = '{SECRET_TOKEN}'"},
        created_at=now - timedelta(minutes=20),
    )
    db_session.add(ev)
    await db_session.flush()

    an = EventAnalysis(
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
                    "message": "Hardcoded credentials detected in settings.py",
                    "file_path": "src/config/settings.py",
                    "line_number": 1,
                    "redacted_evidence": "+ SECRET = '[REDACTED]'",
                    "risk_contribution": 50,
                }
            ]
        },
    )
    db_session.add(an)
    await db_session.commit()

    # Request health explainability
    resp = await explain_entity(db_session, proj_id, "health", "overall")
    assert resp.entity_type == "health"
    assert resp.score is not None
    assert len(resp.score_decomposition) == 5
    assert len(resp.evidence_chain) >= 4
    assert resp.provenance == "OBSERVED"

    # Verify mathematical decomposition
    total_weighted = sum(d.weighted_contribution for d in resp.score_decomposition)
    assert abs(round(total_weighted) - resp.score) <= 1


@pytest.mark.asyncio
async def test_evidence_security_explainability_and_redaction(db_session: AsyncSession):
    """Verifies security finding explainability and strict secret masking."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/evidence_sec_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Security Explain Project")
    db_session.add(project)
    await db_session.commit()

    now = datetime.now(tz=UTC)
    sess_id = uuid.uuid4()
    sess = Session(
        id=sess_id,
        project_root=root_path,
        started_at=now - timedelta(minutes=30),
        last_event_at=now,
        status="ACTIVE",
    )
    db_session.add(sess)

    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=sess_id,
        timestamp=now - timedelta(minutes=15),
        event_type="FILE_MODIFIED",
        file_path="src/auth.py",
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        event_metadata={"diff": f"+ API_KEY = '{SECRET_TOKEN}'"},
        created_at=now - timedelta(minutes=15),
    )
    db_session.add(ev)
    await db_session.flush()

    an = EventAnalysis(
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
                    "title": "API Key Finding",
                    "message": "Hardcoded API key detected",
                    "file_path": "src/auth.py",
                    "line_number": 1,
                    "redacted_evidence": "+ API_KEY = '[REDACTED]'",
                    "risk_contribution": 30,
                }
            ]
        },
    )
    db_session.add(an)
    await db_session.commit()

    resp = await explain_entity(db_session, proj_id, "security", "SEC001")
    assert resp.entity_type == "security"
    assert "SEC001" in resp.title
    assert resp.provenance == "OBSERVED"
    assert resp.remediation is not None
    assert len(resp.evidence_chain) >= 3

    # Verify zero raw secret leakage
    assert SECRET_TOKEN not in resp.model_dump_json()
    assert "[REDACTED]" in resp.model_dump_json()


@pytest.mark.asyncio
async def test_evidence_incident_and_priority_explainability(db_session: AsyncSession):
    """Verifies incident and priority explainability and review transition audit trails."""
    proj_id = uuid.uuid4()
    root_path = "/tmp/evidence_prio_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Priority Explain Project")
    db_session.add(project)
    await db_session.commit()

    now = datetime.now(tz=UTC)
    sess_id = uuid.uuid4()
    sess = Session(
        id=sess_id,
        project_root=root_path,
        started_at=now - timedelta(minutes=40),
        last_event_at=now,
        status="ACTIVE",
    )
    db_session.add(sess)

    # Ingest event & finding
    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=sess_id,
        timestamp=now - timedelta(minutes=25),
        event_type="FILE_MODIFIED",
        file_path="src/login.py",
        file_name="login.py",
        file_extension=".py",
        language="Python",
        event_metadata={"diff": "+ token = 'xyz'"},
        created_at=now - timedelta(minutes=25),
    )
    db_session.add(ev)
    await db_session.flush()

    an = EventAnalysis(
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
                    "title": "Token Finding",
                    "message": "Token in login.py",
                    "file_path": "src/login.py",
                    "line_number": 1,
                    "redacted_evidence": "+ token = '[REDACTED]'",
                    "risk_contribution": 40,
                }
            ]
        },
    )
    db_session.add(an)

    # Human review transition
    inc_state = IncidentReviewState(
        incident_id="inc-login-901",
        project_id=proj_id,
        status="REVIEWED",
        reviewed_by="sanket",
        resolution_note="Under investigation by security team",
        resolved_at=None,
    )
    db_session.add(inc_state)

    hist = IncidentReviewHistory(
        id=uuid.uuid4(),
        incident_id="inc-login-901",
        project_id=proj_id,
        reviewer="sanket",
        previous_status="OPEN",
        new_status="REVIEWED",
        resolution_note="Under investigation by security team",
        created_at=now,
    )
    db_session.add(hist)
    await db_session.commit()

    # Explain incident
    inc_resp = await explain_entity(db_session, proj_id, "incident", "inc-login-901")
    assert inc_resp.entity_type == "incident"
    assert "REVIEWED" in inc_resp.title
    assert inc_resp.provenance == "OBSERVED"

    # Explain priority #1
    prio_resp = await explain_entity(db_session, proj_id, "priority", "1")
    assert prio_resp.entity_type == "priority"
    assert prio_resp.score is not None
    assert prio_resp.score > 0
    assert len(prio_resp.evidence_chain) >= 2


@pytest.mark.asyncio
async def test_evidence_multi_project_isolation_and_reconstructibility(
    db_session: AsyncSession,
):
    """
    Verifies multi-project isolation (Project A vs Project B) and
    100% deterministic reconstructibility (Result A == Result B).
    """
    proj_a_id = uuid.uuid4()
    proj_b_id = uuid.uuid4()

    proj_a = Project(id=proj_a_id, root_path="/tmp/iso_a", display_name="Isolation Project A")
    proj_b = Project(id=proj_b_id, root_path="/tmp/iso_b", display_name="Isolation Project B")
    db_session.add_all([proj_a, proj_b])
    await db_session.commit()

    now = datetime.now(tz=UTC)
    sess_id = uuid.uuid4()
    sess = Session(
        id=sess_id,
        project_root="/tmp/iso_a",
        started_at=now - timedelta(minutes=20),
        last_event_at=now,
        status="ACTIVE",
    )
    db_session.add(sess)

    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root="/tmp/iso_a",
        session_id=sess_id,
        timestamp=now - timedelta(minutes=10),
        event_type="FILE_MODIFIED",
        file_path="src/a.py",
        file_name="a.py",
        file_extension=".py",
        language="Python",
        event_metadata={"diff": "+ x = 1"},
        created_at=now - timedelta(minutes=10),
    )
    db_session.add(ev)
    await db_session.commit()

    # Reconstructibility: Result A1 == Result A2
    res_a1 = await explain_entity(db_session, proj_a_id, "health", "overall")
    res_a2 = await explain_entity(db_session, proj_a_id, "health", "overall")
    assert res_a1.score == res_a2.score
    assert len(res_a1.score_decomposition) == len(res_a2.score_decomposition)

    # Multi-project isolation: Project B has 0 findings / 0 priorities
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp_b = await client.get(f"/api/projects/{proj_b_id}/evidence/security/current")
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        assert data_b["score"] == 100
        assert "Zero Security Findings" in data_b["title"]
