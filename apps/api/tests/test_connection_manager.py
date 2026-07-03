"""Unit tests for ConnectionManager — no network or database needed."""

from unittest.mock import AsyncMock

import pytest
from app.features.events.connection_manager import ConnectionManager


@pytest.mark.asyncio
async def test_connect_accepts_and_tracks_websocket() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()

    await manager.connect(ws)

    ws.accept.assert_awaited_once()
    assert ws in manager._connections


@pytest.mark.asyncio
async def test_disconnect_removes_websocket() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()
    await manager.connect(ws)

    manager.disconnect(ws)

    assert ws not in manager._connections


@pytest.mark.asyncio
async def test_disconnect_is_idempotent_for_unknown_websocket() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()

    manager.disconnect(ws)  # should not raise


@pytest.mark.asyncio
async def test_broadcast_sends_to_all_connections() -> None:
    manager = ConnectionManager()
    first, second = AsyncMock(), AsyncMock()
    await manager.connect(first)
    await manager.connect(second)

    await manager.broadcast({"event_type": "FILE_MODIFIED"})

    first.send_json.assert_awaited_once_with({"event_type": "FILE_MODIFIED"})
    second.send_json.assert_awaited_once_with({"event_type": "FILE_MODIFIED"})


@pytest.mark.asyncio
async def test_broadcast_drops_dead_connections_without_failing_others() -> None:
    manager = ConnectionManager()
    dead, alive = AsyncMock(), AsyncMock()
    dead.send_json.side_effect = RuntimeError("connection closed")
    await manager.connect(dead)
    await manager.connect(alive)

    await manager.broadcast({"event_type": "FILE_CREATED"})

    alive.send_json.assert_awaited_once()
    assert dead not in manager._connections
    assert alive in manager._connections
