import urllib.parse
import uuid
from datetime import UTC, datetime

import pytest
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.projects.models import Project
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_engineering_dna_endpoint_success(
    client: AsyncClient,
    db_session,
):
    # Create project
    project_id = uuid.uuid4()
    project = Project(id=project_id, root_path="/test/project", display_name="Test Project")
    db_session.add(project)

    # Create event
    event_id = uuid.uuid4()
    session_id = uuid.uuid4()
    event = DevelopmentEvent(
        id=event_id,
        event_type="FILE_MODIFIED",
        timestamp=datetime(2024, 1, 1, 10, 0, tzinfo=UTC),
        session_id=session_id,
        project_root="/test/project",
        file_path="src/main.py",
        file_name="main.py",
        file_extension=".py",
    )
    db_session.add(event)
    await db_session.flush()

    # Create analysis
    analysis = EventAnalysis(
        id=uuid.uuid4(),
        event_id=event_id,
        analyzer_name="code_evolution",
        analyzer_version=1,
        findings={
            "observations": [
                {"kind": "FUNCTION_ADDED", "symbol": "login"},
                {"kind": "TODO_INTRODUCED", "symbol": "FIXME: Auth"},
            ]
        },
        duration_ms=10.0,
    )
    db_session.add(analysis)

    await db_session.commit()

    file_id = urllib.parse.quote("src/main.py", safe="")
    response = await client.get(f"/projects/{project_id}/files/{file_id}/dna")

    assert response.status_code == 200
    data = response.json()

    assert data["identity"] == "main.py"
    assert data["path"] == "src/main.py"
    assert data["functions_created"] == 1
    assert data["todos_created"] == 1
    assert len(data["biography"]) == 4  # Created, Function Added, TODO Added, Current State


async def test_engineering_dna_not_found(client: AsyncClient):
    project_id = uuid.uuid4()
    file_id = urllib.parse.quote("src/not_found.py", safe="")
    response = await client.get(f"/projects/{project_id}/files/{file_id}/dna")
    assert response.status_code == 404
