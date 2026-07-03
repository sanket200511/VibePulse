"""
WebSocket connection registry for live event broadcast.

Single-process only: connections are held in an in-memory set. Broadcasting
across multiple API instances requires a shared pub/sub layer (Redis) and is
explicitly deferred — see docs/adr/0003-event-driven-core.md.
"""

from fastapi import WebSocket

from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        logger.info("ws_client_connected", extra={"total_connections": len(self._connections)})

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        logger.info("ws_client_disconnected", extra={"total_connections": len(self._connections)})

    async def broadcast(self, payload: dict) -> None:
        """
        Sends payload to every connected client.

        A client whose send fails (already disconnected, network error) is
        dropped from the registry so it never blocks or breaks broadcast to
        the remaining clients.
        """
        dead: list[WebSocket] = []
        for connection in self._connections:
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection)


# Process-wide singleton — sufficient while the API runs as a single instance.
connection_manager = ConnectionManager()
