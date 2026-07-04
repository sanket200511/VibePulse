"""
Sessions router.

REST:
  GET /sessions          — list recent sessions, newest activity first
  GET /sessions/current  — the session currently ACTIVE or IDLE, if any
  GET /sessions/{id}     — a single session

WebSocket:
  /ws/sessions           — dashboard subscribes to live session lifecycle events

NOTE: /sessions/current is registered before /sessions/{id} — otherwise
FastAPI would try (and fail) to parse "current" as a UUID path parameter.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.features.sessions import service
from app.features.sessions.connection_manager import session_connection_manager
from app.features.sessions.models import Session
from app.features.sessions.schemas import SessionListRead, SessionRead

router = APIRouter(tags=["sessions"])
logger = get_logger(__name__)


def _to_read(session: Session, *, now: datetime) -> SessionRead:
    effective_status = service.compute_effective_status(session, now)
    return SessionRead.from_session(session, effective_status=effective_status)


@router.get(
    "/sessions",
    response_model=SessionListRead,
    summary="List recent sessions",
)
async def list_sessions(db: AsyncSession = Depends(get_db)) -> SessionListRead:
    now = datetime.now(tz=UTC)
    sessions = await service.list_sessions(db)
    return SessionListRead(sessions=[_to_read(s, now=now) for s in sessions])


@router.get(
    "/sessions/current",
    response_model=SessionRead | None,
    summary="Get the current (ACTIVE or IDLE) session, if any",
)
async def get_current_session(db: AsyncSession = Depends(get_db)) -> SessionRead | None:
    now = datetime.now(tz=UTC)
    session = await service.get_current_session(db)
    if session is None:
        return None
    return _to_read(session, now=now)


@router.get(
    "/sessions/{session_id}",
    response_model=SessionRead,
    summary="Get a single session",
)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SessionRead:
    now = datetime.now(tz=UTC)
    session = await service.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return _to_read(session, now=now)


@router.websocket("/ws/sessions")
async def sessions_websocket(websocket: WebSocket) -> None:
    await session_connection_manager.connect(websocket)
    try:
        while True:
            # Broadcast-only; still need to await something so the server
            # notices a client disconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        session_connection_manager.disconnect(websocket)
