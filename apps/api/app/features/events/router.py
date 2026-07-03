"""
Events router.

REST:
  POST /events         — daemon publishes a development event
  GET  /events          — dashboard fetches recent events on load

WebSocket:
  /ws/events            — dashboard subscribes to live event broadcast

WebSocket and REST are intentionally under different path prefixes
(`/ws/...` vs plain resource paths) so the two protocols are never
ambiguous at a glance.
"""

from fastapi import APIRouter, Depends, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.events import service
from app.features.events.connection_manager import connection_manager
from app.features.events.schemas import (
    DevelopmentEventCreate,
    DevelopmentEventList,
    DevelopmentEventRead,
)

router = APIRouter(tags=["events"])
logger = get_logger(__name__)


@router.post(
    "/events",
    response_model=DevelopmentEventRead,
    status_code=201,
    summary="Ingest a development event",
)
async def ingest_event(
    payload: DevelopmentEventCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> DevelopmentEventRead:
    event, was_created = await service.create_event(db, payload)

    if was_created:
        await connection_manager.broadcast(event.model_dump(mode="json"))
    else:
        # Duplicate observation (e.g. editor temp-file rename double-fire) —
        # not an error, so we hand back the existing row instead of 409/500.
        response.status_code = 200

    return event


@router.get(
    "/events",
    response_model=DevelopmentEventList,
    summary="List recent development events",
)
async def list_events(
    db: AsyncSession = Depends(get_db),
) -> DevelopmentEventList:
    events = await service.list_recent_events(db)
    return DevelopmentEventList(events=events)


@router.websocket("/ws/events")
async def events_websocket(websocket: WebSocket) -> None:
    await connection_manager.connect(websocket)
    try:
        while True:
            # This endpoint is broadcast-only; we still need to await
            # something so the server notices a client disconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
