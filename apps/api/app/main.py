"""
VibePulse API - Application entry point.

Wires together FastAPI, middleware, and feature routers.
Business logic lives exclusively inside feature modules.
"""

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import get_logger
from app.features.analysis.router import router as analysis_router
from app.features.events.router import router as events_router
from app.features.health.router import router as health_router
from app.features.insights.router import router as insights_router
from app.features.sessions.router import router as sessions_router
from app.features.sessions.sweep import run_sweep_loop
from app.features.timeline.router import router as timeline_router

settings = get_settings()
logger = get_logger("main")


# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Startup: initialise connection pools, caches, background workers.
    Shutdown: flush buffers, close connections gracefully.
    """
    # No Redis client to initialise yet — the event-driven core still runs on
    # the direct-HTTP interim documented in docs/adr/0003-event-driven-core.md.
    # Wire client construction/teardown in here when that migration begins.
    logger.info("api_startup", extra={"environment": settings.environment})

    # Session Engine sweep loop — detects ACTIVE->IDLE->COMPLETED transitions
    # for sessions that have gone quiet. In-process asyncio task; no
    # additional infrastructure required for a single-instance API.
    sweep_task = asyncio.create_task(run_sweep_loop())

    yield

    sweep_task.cancel()
    try:
        await sweep_task
    except asyncio.CancelledError:
        pass
    logger.info("api_shutdown")


# ── Application factory ───────────────────────────────────────────────────────


def create_app() -> FastAPI:
    app = FastAPI(
        title="VibePulse API",
        description="Developer Observability Platform for the AI Coding Era",
        version="0.1.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    # Each feature registers its own router with an appropriate prefix.
    app.include_router(health_router)
    app.include_router(events_router)
    app.include_router(analysis_router)
    app.include_router(sessions_router)
    app.include_router(timeline_router)
    app.include_router(insights_router)

    return app


app = create_app()
