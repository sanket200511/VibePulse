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

from datetime import UTC, datetime

import httpx
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Response,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.database import get_db, get_session_factory
from app.core.logging import get_logger
from app.features.analysis import service as analysis_service
from app.features.events import service
from app.features.events.connection_manager import connection_manager
from app.features.events.constants import EventType
from app.features.events.schemas import (
    DevelopmentEventCreate,
    DevelopmentEventList,
    DevelopmentEventRead,
    ObservationCommandRequest,
)
from app.features.sessions import service as session_service
from app.features.sessions.connection_manager import session_connection_manager
from app.features.sessions.schemas import SessionRead

router = APIRouter(tags=["events"])
logger = get_logger(__name__)


async def _set_daemon_observation_state(target_state: bool) -> bool:
    """Proxy observation commands to the daemon and return True if already in that state."""
    settings = get_settings()
    daemon_url = settings.daemon_url.rstrip("/")

    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            endpoint = "/control/observe/start" if target_state else "/control/observe/stop"
            control_response = await client.post(f"{daemon_url}{endpoint}")
            control_response.raise_for_status()

            data = control_response.json()
            return bool(data.get("already_active", False))

        except httpx.TimeoutException as err:
            raise HTTPException(status_code=504, detail="Daemon timeout") from err
        except httpx.RequestError as err:
            raise HTTPException(status_code=503, detail="Daemon unavailable") from err
        except httpx.HTTPStatusError as e:
            logger.error(f"Daemon returned error: {e}")
            raise HTTPException(status_code=502, detail="Daemon returned error status") from e


@router.post(
    "/events",
    response_model=DevelopmentEventRead,
    status_code=201,
    summary="Ingest a development event",
)
async def ingest_event(
    payload: DevelopmentEventCreate,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    session_factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> DevelopmentEventRead:
    event, was_created = await service.create_event(db, payload)

    if was_created:
        await connection_manager.broadcast(event.model_dump(mode="json"))
        # Dispatch the analysis pipeline after the 201 response is sent.
        # Uses a fresh session from session_factory — not the request session —
        # because the request session may be closed by the time the task runs.
        # session_factory is itself a dependency (not the module-level
        # AsyncSessionLocal directly) so tests can override it to point at
        # the same engine their own assertions read from.
        analyzable = service.to_analyzable_event(event)
        background_tasks.add_task(analysis_service.dispatch, analyzable, session_factory)

        # Session Engine: attach this event to a session, deciding
        # continuation vs. a new session (the API is the sole authority on
        # this decision — see docs/adr/0005-session-engine.md). Kept
        # synchronous (same request-scoped db session) since it is a cheap
        # counter update, not heavy pipeline work.
        session_row, session_was_created = await session_service.touch_session(db, analyzable)
        now = datetime.now(tz=UTC)
        session_read = SessionRead.from_session(
            session_row, effective_status=session_service.compute_effective_status(session_row, now)
        )
        await session_connection_manager.broadcast(
            {
                "type": "session.started" if session_was_created else "session.updated",
                "session": session_read.model_dump(mode="json"),
            }
        )
    else:
        # Duplicate observation (e.g. editor temp-file rename double-fire) —
        # not an error, so we hand back the existing row instead of 409/500.
        response.status_code = 200

    return event


@router.post(
    "/projects/{project_root}/observation/start",
    response_model=DevelopmentEventRead,
    status_code=201,
    summary="Start observation for a project",
)
async def start_observation(
    project_root: str,
    payload: ObservationCommandRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    session_factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> DevelopmentEventRead:
    is_already_active = await _set_daemon_observation_state(True)

    event_create = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.OBSERVATION_STARTED,
        timestamp=payload.timestamp,
        session_id=payload.session_id,
        project_root=project_root,
        file_path=None,
        file_name=None,
    )

    result = await ingest_event(event_create, response, background_tasks, db, session_factory)
    if is_already_active:
        response.status_code = 200
    return result


@router.post(
    "/projects/{project_root}/observation/stop",
    response_model=DevelopmentEventRead,
    status_code=201,
    summary="Stop observation for a project",
)
async def stop_observation(
    project_root: str,
    payload: ObservationCommandRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    session_factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> DevelopmentEventRead:
    is_already_active = await _set_daemon_observation_state(False)

    event_create = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.OBSERVATION_STOPPED,
        timestamp=payload.timestamp,
        session_id=payload.session_id,
        project_root=project_root,
        file_path=None,
        file_name=None,
    )

    result = await ingest_event(event_create, response, background_tasks, db, session_factory)
    if is_already_active:
        response.status_code = 200
    return result


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
