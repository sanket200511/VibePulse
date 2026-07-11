"""
WebSocket broadcast test.

Uses FastAPI's synchronous TestClient (not the async `client` fixture)
because httpx.AsyncClient has no websocket support. This talks to the
real get_db dependency, which points at the same Postgres database the
`_schema` fixture in conftest.py already created tables on. Depends on
`_clean_rows` (not bare `_schema`) so the rows this test writes don't leak
into later tests in the run.
"""

import uuid
from datetime import UTC, datetime

from app.main import app
from fastapi.testclient import TestClient


def test_websocket_receives_broadcast_on_new_event(_clean_rows: None) -> None:
    # project_root is unique per-test defensively: the Session Engine looks
    # up the most recent non-completed session by project_root (ADR 0005),
    # so even with row cleanup between tests, a hardcoded value here would
    # needlessly couple this test to what other tests in this file use.
    project_root = f"/home/dev/vibepulse-{uuid.uuid4()}"
    payload = {
        "event_type": "FILE_CREATED",
        "timestamp": datetime.now(UTC).isoformat(),
        "session_id": str(uuid.uuid4()),
        "project_root": project_root,
        "file_path": f"{project_root}/app/new_module.py",
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
