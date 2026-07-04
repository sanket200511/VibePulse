"""
WebSocket broadcast test for the Session Engine.

Mirrors tests/test_websocket.py — uses the synchronous TestClient since
httpx.AsyncClient has no websocket support.
"""

import uuid
from datetime import UTC, datetime

from app.main import app
from fastapi.testclient import TestClient


def test_websocket_receives_session_started_on_first_event(_schema: None) -> None:
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

    with TestClient(app) as tc, tc.websocket_connect("/ws/sessions") as ws:
        response = tc.post("/events", json=payload)
        assert response.status_code == 201

        message = ws.receive_json()
        assert message["type"] == "session.started"
        assert message["session"]["project_root"] == payload["project_root"]
        assert message["session"]["event_count"] == 1


def test_websocket_receives_session_updated_on_second_event(_schema: None) -> None:
    session_id = str(uuid.uuid4())

    def _payload(file_path: str) -> dict:
        return {
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": session_id,
            "project_root": "/home/dev/vibepulse-2",
            "file_path": file_path,
            "file_name": file_path.rsplit("/", 1)[-1],
            "file_extension": ".py",
            "language": "python",
            "git_branch": "main",
            "metadata": {},
        }

    with TestClient(app) as tc:
        tc.post("/events", json=_payload("/repo/a.py"))

        with tc.websocket_connect("/ws/sessions") as ws:
            response = tc.post("/events", json=_payload("/repo/b.py"))
            assert response.status_code == 201

            message = ws.receive_json()
            assert message["type"] == "session.updated"
            assert message["session"]["event_count"] == 2
