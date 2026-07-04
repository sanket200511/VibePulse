"""
WebSocket connection registry for live session broadcast.

Mirrors app.features.events.connection_manager — single-process only, same
caveat about multi-instance fan-out requiring a shared pub/sub layer later
(see docs/adr/0003-event-driven-core.md).
"""

from fastapi import WebSocket

from app.core.logging import get_logger

logger = get_logger(__name__)


class SessionConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        logger.info(
            "session_ws_client_connected", extra={"total_connections": len(self._connections)}
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        logger.info(
            "session_ws_client_disconnected", extra={"total_connections": len(self._connections)}
        )

    async def broadcast(self, payload: dict) -> None:
        """Sends payload to every connected client, dropping any that fail."""
        dead: list[WebSocket] = []
        for connection in self._connections:
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection)


# Process-wide singleton — sufficient while the API runs as a single instance.
session_connection_manager = SessionConnectionManager()
