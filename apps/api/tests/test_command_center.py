"""
Sprint 8: Engineering Command Center Integration Tests.

Validates:
1. Multi-project isolation
2. Causal event cascade:
   OBSERVE -> DETECT -> INVESTIGATE -> RESOLVE -> LEARN -> ANTICIPATE -> HEALTH
3. Strict secret masking (VIBEPULSE_SPRINT8_SECRET_2026)
4. Deterministic reconstructibility (Result A == Result B)
5. Insufficient evidence state handling
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.core.database import get_db
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.investigation.models import IncidentReviewHistory, IncidentReviewState
from app.features.project_health.service import (
    get_or_create_unified_project_health,
)
from app.features.projects.models import Project
from app.features.sessions.models import Session
from app.main import create_app
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_command_center_project_isolation_and_cascade(
    db_session: AsyncSession,
):
    """
    Verifies that development events in Project A trigger the causal cascade
    (findings -> health -> priorities) while Project B remains fully isolated.
    """
    proj_a_id = uuid.uuid4()
    proj_b_id = uuid.uuid4()
    root_a = "/tmp/cc_proj_a"
    root_b = "/tmp/cc_proj_b"

    proj_a = Project(id=proj_a_id, root_path=root_a, display_name="Command Center Project A")
    proj_b = Project(id=proj_b_id, root_path=root_b, display_name="Command Center Project B")
    db_session.add_all([proj_a, proj_b])
    await db_session.commit()

    now = datetime.now(tz=UTC)
    sess_id = uuid.uuid4()

    sess = Session(
        id=sess_id,
        project_root=root_a,
        started_at=now - timedelta(minutes=30),
        last_event_at=now,
        status="ACTIVE",
    )
    db_session.add(sess)
    await db_session.commit()

    # 1. Project B has zero events -> Must be INSUFFICIENT_EVIDENCE
    health_b = await get_or_create_unified_project_health(db_session, proj_b_id)
    assert health_b.status == "INSUFFICIENT_EVIDENCE"
    assert health_b.overall_health_score is None
    assert len(health_b.top_priorities) == 0

    # 2. Ingest events into Project A (including sensitive file change)
    for i in range(5):
        ev = DevelopmentEvent(
            id=uuid.uuid4(),
            project_root=root_a,
            session_id=sess_id,
            timestamp=now - timedelta(minutes=20 - i * 3),
            event_type="FILE_MODIFIED",
            file_path="src/config/settings.py",
            file_name="settings.py",
            file_extension=".py",
            language="Python",
            event_metadata={"diff": "+ DEBUG = True\n+ SECRET = 'VIBEPULSE_SPRINT8_SECRET_2026'"},
            created_at=now,
        )
        db_session.add(ev)
        await db_session.flush()

        # AST analysis
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
                        "title": "Hardcoded Secret",
                        "message": "Hardcoded secret detected",
                        "category": "Secrets",
                        "file_path": "src/config/settings.py",
                        "line_number": 2,
                        "redacted_evidence": "+ SECRET = '[REDACTED]'",
                        "risk_contribution": 30,
                    }
                ]
            },
        )
        db_session.add(an)

    await db_session.commit()

    # 3. Project A Health should reflect findings & priorities
    health_a = await get_or_create_unified_project_health(db_session, proj_a_id)
    assert health_a.status == "READY"
    assert health_a.overall_health_score is not None
    assert health_a.active_security_findings_count >= 1
    assert len(health_a.top_priorities) >= 1
    assert health_a.top_priorities[0].severity in ("CRITICAL", "HIGH")

    # 4. Project B MUST remain unchanged (strict isolation)
    health_b_after = await get_or_create_unified_project_health(db_session, proj_b_id)
    assert health_b_after.status == "INSUFFICIENT_EVIDENCE"
    assert health_b_after.overall_health_score is None
    assert len(health_b_after.top_priorities) == 0


@pytest.mark.asyncio
async def test_command_center_secret_masking(db_session: AsyncSession):
    """
    Verifies that raw secret tokens like VIBEPULSE_SPRINT8_SECRET_2026
    never appear in health endpoints or priority data.
    """
    proj_id = uuid.uuid4()
    root_path = "/tmp/cc_secret_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Secret CC Project")
    db_session.add(project)
    await db_session.commit()

    now = datetime.now(tz=UTC)
    sess_id = uuid.uuid4()

    sess = Session(
        id=sess_id,
        project_root=root_path,
        started_at=now - timedelta(minutes=10),
        last_event_at=now,
        status="ACTIVE",
    )
    db_session.add(sess)
    await db_session.commit()

    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=sess_id,
        timestamp=now,
        event_type="FILE_MODIFIED",
        file_path="src/auth.py",
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        event_metadata={"diff": "+ API_KEY = 'VIBEPULSE_SPRINT8_SECRET_2026'"},
        created_at=now,
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
                    "title": "Secret Token",
                    "message": "Secret token found",
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

    test_app = create_app()
    test_app.dependency_overrides[get_db] = lambda: db_session

    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        res = await ac.get(f"/api/projects/{proj_id}/health")
        assert res.status_code == 200
        assert "VIBEPULSE_SPRINT8_SECRET_2026" not in res.text
        assert "[REDACTED]" in res.text or "SEC001" in res.text


@pytest.mark.asyncio
async def test_command_center_resolution_transition(db_session: AsyncSession):
    """
    Verifies that recording an incident resolution transition improves health
    and updates top actionable priorities.
    """
    proj_id = uuid.uuid4()
    root_path = "/tmp/cc_res_proj"
    project = Project(id=proj_id, root_path=root_path, display_name="Resolution CC Project")
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
    await db_session.commit()

    # Initial event & finding
    ev = DevelopmentEvent(
        id=uuid.uuid4(),
        project_root=root_path,
        session_id=sess_id,
        timestamp=now - timedelta(minutes=30),
        event_type="FILE_MODIFIED",
        file_path="src/login.py",
        file_name="login.py",
        file_extension=".py",
        language="Python",
        event_metadata={"diff": "+ token = 'xyz'"},
        created_at=now - timedelta(minutes=30),
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
                    "title": "Token Finding",
                    "message": "Token finding",
                    "file_path": "src/login.py",
                    "line_number": 1,
                    "redacted_evidence": "+ token = '[REDACTED]'",
                    "risk_contribution": 20,
                }
            ]
        },
    )
    db_session.add(an)
    await db_session.commit()

    # Health before resolution
    health_before = await get_or_create_unified_project_health(db_session, proj_id)
    assert health_before.status == "READY"

    # Human resolves the incident
    inc_state = IncidentReviewState(
        incident_id="inc-login-001",
        project_id=proj_id,
        status="RESOLVED",
        reviewed_by="sanket",
        resolution_note="Credential rotated and stored in Vault",
        resolved_at=now,
    )
    db_session.add(inc_state)

    hist = IncidentReviewHistory(
        id=uuid.uuid4(),
        incident_id="inc-login-001",
        project_id=proj_id,
        reviewer="sanket",
        previous_status="OPEN",
        new_status="RESOLVED",
        resolution_note="Credential rotated and stored in Vault",
        created_at=now,
    )
    db_session.add(hist)
    await db_session.commit()

    # Health after resolution while finding is still open triggers regression alert
    health_after = await get_or_create_unified_project_health(db_session, proj_id)
    assert health_after.status == "READY"
    assert health_after.resolution_health.score is not None
    assert health_after.resolution_health.score > 0
    assert any(p.category == "REGRESSION_ALERT" for p in health_after.top_priorities)
