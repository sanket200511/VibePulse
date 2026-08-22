import uuid
from datetime import UTC, datetime

import pytest
from app.features.events.constants import EventType
from app.features.events.schemas import DevelopmentEventCreate
from app.features.events.service import create_event, to_analyzable_event
from app.features.sessions.service import touch_session
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


async def test_ai_provenance_endpoint(client: AsyncClient, db_session: AsyncSession) -> None:
    session_id = uuid.uuid4()
    project_root = "/test/ai-provenance"

    # 1. AI Tool Execution
    event1 = DevelopmentEventCreate(
        event_type=EventType.AI_TOOL_EXECUTED,
        timestamp=datetime.now(UTC),
        session_id=session_id,
        project_root=project_root,
        metadata={"provider": "Cursor", "model": "claude-3.5-sonnet", "tool_count": 1},
    )
    _e1, _ = await create_event(db_session, event1)
    session, _ = await touch_session(db_session, to_analyzable_event(_e1))

    # 2. File Modified Afterwards
    event2 = DevelopmentEventCreate(
        event_type=EventType.FILE_MODIFIED,
        timestamp=datetime.now(UTC),
        session_id=session_id,
        project_root=project_root,
        file_path="src/main.py",
        file_name="main.py",
        metadata={},
    )
    _e2, _ = await create_event(db_session, event2)
    await touch_session(db_session, to_analyzable_event(_e2))

    response = await client.get(f"/sessions/{session.id}/ai-provenance")
    assert response.status_code == 200

    api_response = await client.get(f"/api/sessions/{session.id}/ai-provenance")
    assert api_response.status_code == 200

    # Also test project-level endpoint
    proj_response = await client.get(f"/api/projects/{session.project_id}/ai-provenance")
    assert proj_response.status_code == 200

    data = api_response.json()
    assert data["stats"]["total_interactions"] == 1
    assert data["stats"]["total_tools_executed"] == 1
    assert data["stats"]["providers_used"] == ["Cursor"]
    assert data["stats"]["models_used"] == ["claude-3.5-sonnet"]

    timeline = data["timeline"]
    assert len(timeline) == 1
    assert timeline[0]["provider"] == "Cursor"
    assert "src/main.py" in timeline[0]["files_modified_afterwards"]
