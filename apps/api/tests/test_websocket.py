"""
WebSocket broadcast test.

Uses FastAPI's synchronous TestClient (not the async `client` fixture)
because httpx.AsyncClient has no websocket support. This talks to the
real get_db dependency, which points at the same Postgres database the
`_schema` fixture in conftest.py already created tables on.
"""

import uuid
from datetime import UTC, datetime

from app.main import app
from fastapi.testclient import TestClient


def test_websocket_receives_broadcast_on_new_event(_schema: None) -> None:
    payload = {
        "event_type": "FILE_CREATED",
        "timestamp": datetime.now(UTC).isoformat(),
        "session_id": str(uuid.uuid4()),
        "project_root": "/home/dev/vibepulse",
        "file_path": "/home/dev/vibepulse/apps/api/app/new_module.py",
        "file_name": "new_module.py",
        "file_extension": ".py",
        "language": "python",
        "git_branch": "main",
        "metadata": {},
    }

    with TestClient(app) as tc, tc.websocket_connect("/ws/events") as ws:
        response = tc.post("/events", json=payload)
        assert response.status_code == 201

        message = ws.receive_json()
        assert message["file_path"] == payload["file_path"]
        assert message["event_type"] == "FILE_CREATED"
