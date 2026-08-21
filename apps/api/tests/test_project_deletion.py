import os
import pathlib
import uuid
from datetime import UTC, datetime
from unittest.mock import patch

import httpx
import pytest
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.investigation.domain import parse_investigation_query
from app.features.investigation.repository import execute_investigation_query
from app.features.project_context.models import ProjectContext
from app.features.project_context.service import get_or_create_project_context
from app.features.projects.models import Project
from app.features.sessions.constants import SessionStatus
from app.features.sessions.models import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_delete_project_success(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    # 1. Create project
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/safe_delete_1", "display_name": "Safe-Delete-1"},
    )
    assert proj_res.status_code == 200
    p_id = proj_res.json()["id"]

    # 2. Add an ended session and events
    sess_id = uuid.uuid4()
    session = Session(
        id=sess_id,
        project_id=uuid.UUID(p_id),
        project_root="/test/safe_delete_1",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
        ended_at=datetime.now(UTC),
        event_count=1,
    )
    db_session.add(session)
    await db_session.flush()

    event = DevelopmentEvent(
        id=uuid.uuid4(),
        session_id=sess_id,
        project_root="/test/safe_delete_1",
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(UTC),
        file_path="/test/safe_delete_1/main.py",
        file_name="main.py",
        language="Python",
        event_metadata={},
    )
    db_session.add(event)
    await db_session.commit()

    # Create project context
    await get_or_create_project_context(db_session, uuid.UUID(p_id))
    await db_session.commit()

    # 3. Call DELETE /api/projects/{id}
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["deleted"] is True
    assert data["project_id"] == p_id
    assert data["project_name"] == "Safe-Delete-1"
    assert data["deleted_counts"]["events"] == 1
    assert data["deleted_counts"]["sessions"] == 1
    assert data["deleted_counts"]["context"] == 1

    # 4. Verify in DB
    db_session.expire_all()
    p_check = await db_session.get(Project, uuid.UUID(p_id))
    assert p_check is None


@pytest.mark.asyncio
async def test_delete_project_cascades_context(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/cascade_ctx", "display_name": "Cascade-Ctx"},
    )
    p_id = uuid.UUID(proj_res.json()["id"])

    # Ensure context exists
    await get_or_create_project_context(db_session, p_id)
    await db_session.commit()

    ctx_res = await db_session.execute(
        select(ProjectContext).where(ProjectContext.project_id == p_id)
    )
    assert ctx_res.scalar_one_or_none() is not None

    # Delete project
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200

    # Verify context removed
    db_session.expire_all()
    ctx_check = await db_session.execute(
        select(ProjectContext).where(ProjectContext.project_id == p_id)
    )
    assert ctx_check.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_project_cascades_sessions(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/cascade_sess", "display_name": "Cascade-Sess"},
    )
    p_id = uuid.UUID(proj_res.json()["id"])

    s1 = Session(
        id=uuid.uuid4(),
        project_id=p_id,
        project_root="/test/cascade_sess",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
    )
    db_session.add(s1)
    await db_session.commit()

    # Delete project
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200

    # Verify session removed
    db_session.expire_all()
    s_check = await db_session.get(Session, s1.id)
    assert s_check is None


@pytest.mark.asyncio
async def test_delete_project_cascades_events_and_analyses(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/cascade_ev", "display_name": "Cascade-Ev"},
    )
    p_id = uuid.UUID(proj_res.json()["id"])

    sess_id = uuid.uuid4()
    s = Session(
        id=sess_id,
        project_id=p_id,
        project_root="/test/cascade_ev",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
    )
    db_session.add(s)
    await db_session.flush()

    ev_id = uuid.uuid4()
    ev = DevelopmentEvent(
        id=ev_id,
        session_id=sess_id,
        project_root="/test/cascade_ev",
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(UTC),
        file_path="/test/cascade_ev/auth.py",
        file_name="auth.py",
        event_metadata={},
    )
    db_session.add(ev)
    await db_session.flush()

    analysis = EventAnalysis(
        id=uuid.uuid4(),
        event_id=ev_id,
        analyzer_name="security_guardian",
        analyzer_version=1,
        findings={"risk_score": 80, "severity": "HIGH"},
        duration_ms=5.0,
    )
    db_session.add(analysis)
    await db_session.commit()

    # Delete project
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted_counts"]["events"] == 1
    assert del_res.json()["deleted_counts"]["analyses"] == 1

    # Verify events and analyses removed
    db_session.expire_all()
    ev_check = await db_session.get(DevelopmentEvent, ev_id)
    assert ev_check is None
    an_check = await db_session.get(EventAnalysis, analysis.id)
    assert an_check is None


@pytest.mark.asyncio
async def test_delete_project_cascades_investigations(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/cascade_inv", "display_name": "Cascade-Inv"},
    )
    p_id = uuid.UUID(proj_res.json()["id"])

    sess_id = uuid.uuid4()
    s = Session(
        id=sess_id,
        project_id=p_id,
        project_root="/test/cascade_inv",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
    )
    db_session.add(s)
    await db_session.flush()

    ev_id = uuid.uuid4()
    ev = DevelopmentEvent(
        id=ev_id,
        session_id=sess_id,
        project_root="/test/cascade_inv",
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(UTC),
        file_path="/test/cascade_inv/token.py",
        file_name="token.py",
        event_metadata={},
    )
    db_session.add(ev)
    await db_session.flush()

    analysis = EventAnalysis(
        id=uuid.uuid4(),
        event_id=ev_id,
        analyzer_name="security_guardian",
        analyzer_version=1,
        findings={"risk_score": 90, "rule_id": "SEC001"},
        duration_ms=3.2,
    )
    db_session.add(analysis)
    await db_session.commit()

    # Verify investigation query matches before deletion
    query = parse_investigation_query("")
    _events, total = await execute_investigation_query(db_session, query, project_id=p_id)
    assert total == 1

    # Delete project
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200

    # Verify investigation query returns exactly 0 after deletion
    db_session.expire_all()
    events_after, total_after = await execute_investigation_query(
        db_session, query, project_id=p_id
    )
    assert total_after == 0
    assert len(events_after) == 0


@pytest.mark.asyncio
async def test_delete_active_project_returns_409(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/active_protect", "display_name": "Active-Protect"},
    )
    p_id = uuid.UUID(proj_res.json()["id"])

    # Create ACTIVE session
    active_session = Session(
        id=uuid.uuid4(),
        project_id=p_id,
        project_root="/test/active_protect",
        status=SessionStatus.ACTIVE.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
    )
    db_session.add(active_session)
    await db_session.commit()

    # Attempt deletion
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 409
    err_body = del_res.json()["detail"]
    assert err_body["error"] == "PROJECT_ACTIVE"
    assert err_body["project_name"] == "Active-Protect"
    assert "Stop observation before deleting" in err_body["message"]

    # Verify project still exists in DB
    db_session.expire_all()
    p_check = await db_session.get(Project, p_id)
    assert p_check is not None


@pytest.mark.asyncio
async def test_delete_nonexistent_project_returns_404(client: httpx.AsyncClient) -> None:
    random_id = uuid.uuid4()
    del_res = await client.delete(f"/api/projects/{random_id}")
    assert del_res.status_code == 404
    assert del_res.json()["detail"] == "Project not found"


@pytest.mark.asyncio
async def test_delete_project_does_not_delete_filesystem(
    client: httpx.AsyncClient, tmp_path: pathlib.Path
) -> None:
    # 1. Create a physical project directory on disk with an important sentinel file
    proj_dir = tmp_path / "MyRealSourceProject"
    proj_dir.mkdir(parents=True, exist_ok=True)
    sentinel_file = proj_dir / "IMPORTANT_FILE.txt"
    sentinel_content = "PROPRIETARY USER SOURCE CODE -- DO NOT DELETE"
    sentinel_file.write_text(sentinel_content, encoding="utf-8")

    assert proj_dir.exists()
    assert sentinel_file.exists()

    # 2. Register project in VibePulse
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": str(proj_dir), "display_name": "MyRealSourceProject"},
    )
    assert proj_res.status_code == 200
    p_id = proj_res.json()["id"]

    # 3. Delete from VibePulse
    del_res = await client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200

    # 4. Verify the physical directory and files are 100% untouched
    assert os.path.exists(str(proj_dir)), "Physical project directory must NOT be deleted!"
    assert os.path.exists(str(sentinel_file)), "Physical source file must NOT be deleted!"
    assert sentinel_file.read_text(encoding="utf-8") == sentinel_content


@pytest.mark.asyncio
async def test_delete_project_isolated_from_other_projects(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    # 1. Create Project Alpha
    res_alpha = await client.post(
        "/api/projects",
        json={"root_path": "/test/alpha_service", "display_name": "Alpha-Service"},
    )
    p_alpha_id = uuid.UUID(res_alpha.json()["id"])

    s_alpha_id = uuid.uuid4()
    s_alpha = Session(
        id=s_alpha_id,
        project_id=p_alpha_id,
        project_root="/test/alpha_service",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
    )
    db_session.add(s_alpha)
    await db_session.flush()

    ev_alpha_id = uuid.uuid4()
    ev_alpha = DevelopmentEvent(
        id=ev_alpha_id,
        session_id=s_alpha_id,
        project_root="/test/alpha_service",
        event_type="FILE_CREATED",
        timestamp=datetime.now(UTC),
        file_path="/test/alpha_service/server.ts",
        file_name="server.ts",
        language="TypeScript",
        event_metadata={},
    )
    db_session.add(ev_alpha)
    await get_or_create_project_context(db_session, p_alpha_id)

    # 2. Create Project Beta
    res_beta = await client.post(
        "/api/projects",
        json={"root_path": "/test/beta_analytics", "display_name": "Beta-Analytics"},
    )
    p_beta_id = uuid.UUID(res_beta.json()["id"])

    s_beta_id = uuid.uuid4()
    s_beta = Session(
        id=s_beta_id,
        project_id=p_beta_id,
        project_root="/test/beta_analytics",
        status=SessionStatus.COMPLETED.value,
        started_at=datetime.now(UTC),
        last_event_at=datetime.now(UTC),
    )
    db_session.add(s_beta)
    await db_session.flush()

    ev_beta_id = uuid.uuid4()
    ev_beta = DevelopmentEvent(
        id=ev_beta_id,
        session_id=s_beta_id,
        project_root="/test/beta_analytics",
        event_type="FILE_MODIFIED",
        timestamp=datetime.now(UTC),
        file_path="/test/beta_analytics/app.py",
        file_name="app.py",
        language="Python",
        event_metadata={},
    )
    db_session.add(ev_beta)
    await get_or_create_project_context(db_session, p_beta_id)
    await db_session.commit()

    # 3. Delete Project Alpha
    del_res = await client.delete(f"/api/projects/{p_alpha_id}")
    assert del_res.status_code == 200

    # 4. Verify Project Alpha is absent
    db_session.expire_all()
    assert await db_session.get(Project, p_alpha_id) is None
    assert await db_session.get(Session, s_alpha_id) is None
    assert await db_session.get(DevelopmentEvent, ev_alpha_id) is None
    ctx_alpha = await db_session.execute(
        select(ProjectContext).where(ProjectContext.project_id == p_alpha_id)
    )
    assert ctx_alpha.scalar_one_or_none() is None

    # 5. Verify Project Beta remains completely INTACT
    p_beta = await db_session.get(Project, p_beta_id)
    assert p_beta is not None
    assert p_beta.display_name == "Beta-Analytics"
    assert await db_session.get(Session, s_beta_id) is not None
    assert await db_session.get(DevelopmentEvent, ev_beta_id) is not None
    ctx_beta = await db_session.execute(
        select(ProjectContext).where(ProjectContext.project_id == p_beta_id)
    )
    assert ctx_beta.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_delete_rollback_on_failure(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    # 1. Create project
    proj_res = await client.post(
        "/api/projects",
        json={"root_path": "/test/rollback_target", "display_name": "Rollback-Target"},
    )
    p_id = uuid.UUID(proj_res.json()["id"])
    await get_or_create_project_context(db_session, p_id)
    await db_session.commit()

    # 2. Simulate failure during commit
    with patch.object(AsyncSession, "commit", side_effect=RuntimeError("Simulated DB Crash")):
        with pytest.raises(RuntimeError, match="Simulated DB Crash"):
            from app.features.projects.service import delete_project

            await delete_project(db_session, p_id)

    # 3. Verify that after rollback, project and context are still intact in DB
    await db_session.rollback()
    db_session.expire_all()
    p_check = await db_session.get(Project, p_id)
    assert p_check is not None
    ctx_check = (
        await db_session.execute(select(ProjectContext).where(ProjectContext.project_id == p_id))
    ).scalar_one_or_none()
    assert ctx_check is not None
