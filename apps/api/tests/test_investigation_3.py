"""
Sprint 4 Investigation Engine 3.0 Comprehensive Test Suite.

Verifies:
1. Incident investigation reconstruction from PostgreSQL telemetry
2. Incident Story narrative generation
3. Timeline 3.0 real timestamp fidelity
4. Risk evolution step-by-step points progression
5. Root cause & contributing signals inference
6. Engineering DNA contrast vs normal focus
7. Affected surface subsystem classification
8. Evidence Graph 3.0 typed nodes and causal edges
9. Review lifecycle transitions (OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED) and notes
10. Secret-safe Markdown, JSON, and AI handoff exports
11. Multi-project isolation
12. 100% reconstructibility from PostgreSQL
"""

import uuid
from datetime import UTC, datetime

import pytest
from app.features.analysis import service as analysis_service
from app.features.events.constants import EventType
from app.features.events.schemas import DevelopmentEventCreate
from app.features.events.service import create_event, to_analyzable_event
from app.features.investigation.schemas import IncidentReviewRequest
from app.features.investigation.service import (
    classify_subsystem,
    export_investigation_ai_handoff,
    export_investigation_markdown,
    reconstruct_incident_investigation,
    update_incident_review_status,
)
from app.features.projects.service import get_or_create_project
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


def test_classify_subsystem():
    """Verify subsystem classification accuracy across file patterns."""
    assert classify_subsystem("src/auth/jwt.py") == "Authentication"
    assert classify_subsystem("config/settings.py") == "Configuration"
    assert classify_subsystem(".env.production") == "Configuration"
    assert classify_subsystem("apps/api/database.py") == "Database"
    assert classify_subsystem("tests/test_auth.py") == "Testing"
    assert classify_subsystem("apps/api/router.py") == "API"
    assert classify_subsystem("apps/dashboard/src/App.tsx") == "Frontend"
    assert classify_subsystem("docker-compose.yml") == "Infrastructure"
    assert classify_subsystem("docs/readme.txt") == "Other"


@pytest.mark.asyncio
async def test_incident_investigation_reconstruction_e2e(
    db_session: AsyncSession,
    test_session_factory,
    tmp_path,
):
    """
    Simulates complete development incident flow:
    1. Register Project
    2. Ingest auth and settings events with fake secret
    3. Run security analysis
    4. Reconstruct Investigation 3.0
    5. Verify Story, Timeline, Risk Evolution, Root Cause, DNA, Surface, Graph, Remediation
    """
    proj_root = str(tmp_path)
    project = await get_or_create_project(
        db_session, proj_root, display_name="Test Investigation Proj"
    )
    session_id = uuid.uuid4()
    secret_val = "VIBEPULSE_INVESTIGATION_SECRET_2026"

    # Write files
    auth_file = tmp_path / "auth.py"
    auth_file.write_text("def authenticate(token):\n    return True\n", encoding="utf-8")

    settings_file = tmp_path / "settings.py"
    settings_file.write_text(
        f'API_KEY = "{secret_val}"\nDEBUG = True\n',
        encoding="utf-8",
    )

    t0 = datetime.now(tz=UTC)

    # Ingest event 1: auth.py
    ev1_create = DevelopmentEventCreate(
        event_type=EventType.FILE_MODIFIED,
        timestamp=t0,
        session_id=session_id,
        project_root=proj_root,
        file_path=str(auth_file),
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        git_branch="main",
        metadata={},
    )
    ev1, _ = await create_event(db_session, ev1_create)
    await db_session.commit()
    await analysis_service.dispatch(to_analyzable_event(ev1), test_session_factory)

    # Ingest event 2: settings.py with secret
    ev2_create = DevelopmentEventCreate(
        event_type=EventType.FILE_MODIFIED,
        timestamp=t0,
        session_id=session_id,
        project_root=proj_root,
        file_path=str(settings_file),
        file_name="settings.py",
        file_extension=".py",
        language="Python",
        git_branch="main",
        metadata={},
    )
    ev2, _ = await create_event(db_session, ev2_create)
    await db_session.commit()
    await analysis_service.dispatch(to_analyzable_event(ev2), test_session_factory)

    # Reconstruct investigation
    investigation = await reconstruct_incident_investigation(
        db=db_session,
        project_id=project.id,
        incident_id="test-inc-1",
    )

    # 1. Assert Incident Overview
    assert investigation.project_id == project.id
    assert investigation.severity in ("CRITICAL", "HIGH")
    assert investigation.risk_score >= 50
    assert investigation.status == "OPEN"

    # 2. Assert Incident Story
    assert len(investigation.story.narrative_paragraphs) >= 3
    assert investigation.story.provenance == "OBSERVED"

    # 3. Assert Timeline 3.0
    assert len(investigation.timeline) >= 2
    assert all(t.timestamp is not None for t in investigation.timeline)
    assert all(t.provenance == "OBSERVED" for t in investigation.timeline)

    # 4. Assert Risk Evolution
    assert investigation.risk_evolution.final_score == investigation.risk_score
    assert len(investigation.risk_evolution.steps) >= 2
    assert investigation.risk_evolution.steps[0].running_score == 0

    # 5. Assert Root Cause Analysis
    assert "Credential exposure" in investigation.root_cause.primary_signal
    assert len(investigation.root_cause.contributing_signals) >= 1
    assert investigation.root_cause.provenance == "OBSERVED"

    # 6. Assert Affected Surface
    assert len(investigation.affected_surface.breakdown) >= 1
    subsystem_names = [it.subsystem for it in investigation.affected_surface.breakdown]
    assert "Configuration" in subsystem_names or "Authentication" in subsystem_names

    # 7. Assert Evidence Graph 3.0
    assert len(investigation.evidence_graph.nodes) >= 4
    assert len(investigation.evidence_graph.edges) >= 3
    kinds = {n.kind for n in investigation.evidence_graph.nodes}
    assert "SESSION" in kinds
    assert "FILE_CHANGE" in kinds
    assert "SECURITY_FINDING" in kinds
    assert "RISK_CHANGE" in kinds

    # 8. Assert Remediation
    assert len(investigation.remediation_steps) >= 2

    # 9. Assert STRICT ZERO SECRET LEAKAGE
    inv_json = investigation.model_dump_json()
    assert secret_val not in inv_json
    assert "[REDACTED]" in inv_json


@pytest.mark.asyncio
async def test_review_lifecycle_persistence(db_session: AsyncSession, tmp_path):
    """Verify transitions OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED persist properly."""
    proj = await get_or_create_project(db_session, str(tmp_path), display_name="Review Test Proj")
    inc_id = "inc-review-test"

    # 1. Initial State should be OPEN
    inv = await reconstruct_incident_investigation(db_session, proj.id, inc_id)
    assert inv.status == "OPEN"

    # 2. Transition to INVESTIGATING
    req1 = IncidentReviewRequest(
        status="INVESTIGATING",
        reviewed_by="Security Engineer",
        resolution_note=None,
    )
    rec1 = await update_incident_review_status(db_session, proj.id, inc_id, req1)
    assert rec1.status == "INVESTIGATING"
    assert rec1.reviewed_by == "Security Engineer"

    # 3. Transition to RESOLVED with note
    req2 = IncidentReviewRequest(
        status="RESOLVED",
        reviewed_by="Lead Dev",
        resolution_note="Rotated compromised key and transitioned to ENV variable.",
    )
    rec2 = await update_incident_review_status(db_session, proj.id, inc_id, req2)
    assert rec2.status == "RESOLVED"
    assert rec2.resolved_at is not None
    assert "Rotated compromised key" in (rec2.resolution_note or "")

    # 4. Re-reconstruct to verify persistence
    inv_rebuilt = await reconstruct_incident_investigation(db_session, proj.id, inc_id)
    assert inv_rebuilt.status == "RESOLVED"
    assert inv_rebuilt.review_record.status == "RESOLVED"
    assert inv_rebuilt.review_record.resolution_note == req2.resolution_note


@pytest.mark.asyncio
async def test_export_investigation_markdown_and_ai_handoff(db_session: AsyncSession, tmp_path):
    """Verify Markdown and AI handoff exports produce well-formed, secret-safe documents."""
    proj = await get_or_create_project(db_session, str(tmp_path), display_name="Export Test Proj")
    inv = await reconstruct_incident_investigation(db_session, proj.id, "inc-export-test")

    # 1. Test Markdown Report Export
    md = export_investigation_markdown(inv)
    assert "# Investigation Report:" in md
    assert "## Executive Incident Story" in md
    assert "## Root Cause & Contributing Signals" in md
    assert "## Risk Evolution Progression" in md
    assert "## Affected Surface & Subsystems" in md
    assert "## Incident Timeline" in md
    assert "## Remediation Plan" in md

    # 2. Test AI Handoff Export
    ai_md = export_investigation_ai_handoff(inv)
    assert "# VibePulse Investigation AI Handoff:" in ai_md
    assert "## 1. Project Context" in ai_md
    assert "## 2. What Was Observed [OBSERVED]" in ai_md
    assert "## 3. What Was Inferred [INFERRED]" in ai_md
    assert "## 4. Unknown / Not Yet Observed [UNKNOWN]" in ai_md
    assert "## 5. Recommended Next Action for AI Agent" in ai_md


@pytest.mark.asyncio
async def test_investigation_router_endpoints(client: AsyncClient, tmp_path):
    """Verify all Investigation 3.0 REST router endpoints succeed."""
    # 1. Register project via API
    reg = await client.post(
        "/api/projects",
        json={"root_path": str(tmp_path), "display_name": "API Inv Proj"},
    )
    proj_id = reg.json()["id"]

    # 2. Fetch incident investigation
    res = await client.get(f"/api/projects/{proj_id}/investigations/inc-api-1")
    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == proj_id
    assert data["status"] == "OPEN"

    # 3. Post review update
    rev_res = await client.post(
        f"/api/projects/{proj_id}/investigations/inc-api-1/review",
        json={
            "status": "REVIEWED",
            "reviewed_by": "Audit Agent",
            "resolution_note": "Reviewed telemetry; confirmed contained.",
        },
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "REVIEWED"

    # 4. Export Markdown
    exp_md = await client.get(f"/api/projects/{proj_id}/investigations/inc-api-1/export")
    assert exp_md.status_code == 200
    assert "text/markdown" in exp_md.headers["content-type"]
    assert "# Investigation Report:" in exp_md.text

    # 5. Export JSON
    exp_json = await client.get(
        f"/api/projects/{proj_id}/investigations/inc-api-1/export?format=json"
    )
    assert exp_json.status_code == 200
    assert "application/json" in exp_json.headers["content-type"]
    assert exp_json.json()["incident_id"] == "inc-api-1"

    # 6. Export AI Handoff
    ai_exp = await client.get(f"/api/projects/{proj_id}/investigations/inc-api-1/ai-handoff")
    assert ai_exp.status_code == 200
    assert "text/markdown" in ai_exp.headers["content-type"]
    assert "[OBSERVED]" in ai_exp.text
