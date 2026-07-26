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


@pytest.mark.asyncio
async def test_get_project_sessions_404(client: AsyncClient):
    response = await client.get(f"/api/projects/{uuid.uuid4()}/sessions")
    assert response.status_code == 404
