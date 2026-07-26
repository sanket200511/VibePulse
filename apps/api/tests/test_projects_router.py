import datetime
import uuid

import pytest
from app.features.projects.models import Project
from app.features.sessions.models import Session
from httpx import AsyncClient


@pytest.fixture
async def projects_test_data(db_session):
    p1_root = f"d:/test/{uuid.uuid4()}"
    p2_root = f"d:/test/{uuid.uuid4()}"
    p1 = Project(id=uuid.uuid4(), root_path=p1_root, display_name="A")
    p2 = Project(id=uuid.uuid4(), root_path=p2_root, display_name="B")
    db_session.add_all([p1, p2])
    await db_session.flush()

    s1 = Session(
        id=uuid.uuid4(),
        project_id=p1.id,
        project_root=p1_root,
        status="COMPLETED",
        started_at=datetime.datetime.now(datetime.UTC),
        last_event_at=datetime.datetime.now(datetime.UTC),
        event_count=1,
        events_by_type={},
        languages={},
    )
    db_session.add(s1)
    await db_session.commit()
    return p1, p2, s1


@pytest.mark.asyncio
async def test_get_projects_empty(client: AsyncClient):
    response = await client.get("/api/projects")
    assert response.status_code == 200
    assert "projects" in response.json()


@pytest.mark.asyncio
async def test_get_projects_list(client: AsyncClient, projects_test_data):
    p1, p2, _ = projects_test_data
    response = await client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()["projects"]
    assert len(data) >= 2
    ids = [p["id"] for p in data]
    assert str(p1.id) in ids
    assert str(p2.id) in ids


@pytest.mark.asyncio
async def test_get_project_by_id(client: AsyncClient, projects_test_data):
    p1, _, _ = projects_test_data
    response = await client.get(f"/api/projects/{p1.id}")
    assert response.status_code == 200
    assert response.json()["id"] == str(p1.id)


@pytest.mark.asyncio
async def test_get_project_404(client: AsyncClient):
    response = await client.get(f"/api/projects/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_sessions(client: AsyncClient, projects_test_data):
    p1, _, s1 = projects_test_data
    response = await client.get(f"/api/projects/{p1.id}/sessions")
    assert response.status_code == 200
    data = response.json()["sessions"]
    assert len(data) == 1
    assert data[0]["id"] == str(s1.id)
    assert data[0]["project_id"] == str(p1.id)
    assert response.json()["total"] == 1
    assert response.json()["has_more"] is False
    assert response.json()["limit"] == 20
    assert response.json()["offset"] == 0


@pytest.mark.asyncio
async def test_get_project_sessions_404(client: AsyncClient):
    response = await client.get(f"/api/projects/{uuid.uuid4()}/sessions")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_sessions_pagination(client: AsyncClient, projects_test_data):
    p1, _, _ = projects_test_data
    response = await client.get(f"/api/projects/{p1.id}/sessions?limit=10&offset=5")
    assert response.status_code == 200
    assert response.json()["limit"] == 10
    assert response.json()["offset"] == 5
    # with 1 total session, offset 5 means no sessions returned
    assert len(response.json()["sessions"]) == 0
    assert response.json()["total"] == 1
    assert response.json()["has_more"] is False


@pytest.mark.asyncio
async def test_get_project_sessions_pagination_matrix(client: AsyncClient, db_session):
    p1 = Project(id=uuid.uuid4(), root_path=f"d:/test/{uuid.uuid4()}", display_name="A")
    p2 = Project(id=uuid.uuid4(), root_path=f"d:/test/{uuid.uuid4()}", display_name="B")
    db_session.add_all([p1, p2])
    await db_session.flush()

    # Create 5 sessions for p1, 3 for p2
    base_time = datetime.datetime.now(datetime.UTC)
    s_p1 = [
        Session(
            id=uuid.uuid4(),
            project_id=p1.id,
            project_root=p1.root_path,
            status="COMPLETED",
            started_at=base_time - datetime.timedelta(hours=i),
            last_event_at=base_time - datetime.timedelta(hours=i),
            event_count=1,
            events_by_type={},
            languages={},
        )
        for i in range(5)
    ]
    s_p2 = [
        Session(
            id=uuid.uuid4(),
            project_id=p2.id,
            project_root=p2.root_path,
            status="COMPLETED",
            started_at=base_time - datetime.timedelta(hours=i),
            last_event_at=base_time - datetime.timedelta(hours=i),
            event_count=1,
            events_by_type={},
            languages={},
        )
        for i in range(3)
    ]
    db_session.add_all(s_p1 + s_p2)
    await db_session.commit()

    # 1. EMPTY PROJECT (a new project with no sessions)
    p3 = Project(id=uuid.uuid4(), root_path=f"d:/test/{uuid.uuid4()}", display_name="C")
    db_session.add(p3)
    await db_session.commit()
    r = await client.get(f"/api/projects/{p3.id}/sessions")
    assert r.status_code == 200
    assert r.json()["total"] == 0
    assert len(r.json()["sessions"]) == 0

    # 2. STRICT PROJECT OWNERSHIP & DETERMINISTIC ORDERING
    r = await client.get(f"/api/projects/{p1.id}/sessions")
    data = r.json()["sessions"]
    assert len(data) == 5
    assert all(s["project_id"] == str(p1.id) for s in data)
    # Check ordering (descending by started_at)
    started_ats = [s["started_at"] for s in data]
    assert started_ats == sorted(started_ats, reverse=True)

    # 3. SECOND PAGE & FINAL PAGE
    r = await client.get(f"/api/projects/{p1.id}/sessions?limit=2&offset=0")
    assert len(r.json()["sessions"]) == 2
    assert r.json()["has_more"] is True

    r = await client.get(f"/api/projects/{p1.id}/sessions?limit=2&offset=2")
    assert len(r.json()["sessions"]) == 2
    assert r.json()["has_more"] is True

    r = await client.get(f"/api/projects/{p1.id}/sessions?limit=2&offset=4")
    assert len(r.json()["sessions"]) == 1
    assert r.json()["has_more"] is False

    # 4. LIMIT ABOVE MAXIMUM & NEGATIVE LIMIT & NEGATIVE OFFSET
    r = await client.get(f"/api/projects/{p1.id}/sessions?limit=500")
    assert r.status_code == 422  # FastAPI validation rejection

    r = await client.get(f"/api/projects/{p1.id}/sessions?limit=0")
    assert r.status_code == 422

    r = await client.get(f"/api/projects/{p1.id}/sessions?limit=-1")
    assert r.status_code == 422

    r = await client.get(f"/api/projects/{p1.id}/sessions?offset=-1")
    assert r.status_code == 422
