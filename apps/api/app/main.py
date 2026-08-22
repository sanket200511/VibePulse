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
from app.core.database import engine
from app.core.logging import get_logger
from app.features.analysis.router import router as analysis_router
from app.features.events.router import router as events_router
from app.features.health.router import router as health_router
from app.features.insights.router import router as insights_router
from app.features.projects.router import router as projects_router
from app.features.replay.router import router as replay_router
from app.features.session_health.router import router as session_health_router
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

    # De-reference (without closing) any connections a previous event loop
    # left checked into the pool. `engine` is a module-level singleton, so if
    # anything touched it before this lifespan started on *this* loop (e.g. a
    # prior lifespan's loop, in a process that runs the app's lifespan more
    # than once, as tests do), those connections are unusable here — asyncpg
    # connections are bound to the loop that opened them. close=False avoids
    # actually closing them from the wrong loop; the pool simply opens fresh
    # connections against the current loop as needed.
    await engine.dispose(close=False)
    logger.info("api_startup", extra={"environment": settings.environment})

    # Verify database connectivity and schema before starting background tasks
    from sqlalchemy import text
    from sqlalchemy.engine.url import make_url

    parsed_url = make_url(settings.database_url)
    db_host = parsed_url.host or "localhost"
    db_port = parsed_url.port or 5432
    db_name = parsed_url.database or "vibepulse"

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1 FROM sessions LIMIT 1"))
    except Exception as e:
        err_msg = str(e).lower()
        if "refused" in err_msg or "connect" in err_msg or "10061" in err_msg:
            msg = (
                f"PostgreSQL is not reachable at {db_host}:{db_port}. "
                "Start the local PostgreSQL service and run `pnpm setup` "
                "if this is a fresh environment."
            )
            logger.error(f"api_startup_failed: {msg}", exc_info=e)
            raise RuntimeError(msg) from e
        elif "password" in err_msg or "authentication" in err_msg:
            msg = (
                f"PostgreSQL authentication failed for database '{db_name}' "
                f"at {db_host}:{db_port}. "
                "Check your DATABASE_URL credentials in apps/api/.env."
            )
            logger.error(f"api_startup_failed: {msg}", exc_info=e)
            raise RuntimeError(msg) from e
        elif "database" in err_msg and "does not exist" in err_msg:
            msg = (
                f"PostgreSQL database '{db_name}' does not exist on {db_host}:{db_port}. "
                "Run `pnpm setup` to initialize the database."
            )
            logger.error(f"api_startup_failed: {msg}", exc_info=e)
            raise RuntimeError(msg) from e
        elif "relation" in err_msg and "does not exist" in err_msg:
            msg = (
                "Database schema is not initialized (missing tables). "
                "Run `uv run alembic upgrade head` or `pnpm setup`."
            )
            logger.error(f"api_startup_failed: {msg}", exc_info=e)
            raise RuntimeError(msg) from e
        else:
            msg = (
                f"Database check failed: {e}. "
                "Please ensure PostgreSQL is running and run `pnpm setup`."
            )
            logger.error(f"api_startup_failed: {msg}", exc_info=e)
            raise RuntimeError(msg) from e

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

    # Release pooled connections before this event loop goes away. asyncpg
    # connections are bound to the loop that opened them, so leaving them in
    # the pool for a future lifespan (started on a different loop, e.g. a
    # new TestClient block) to reuse is unsafe.
    await engine.dispose()
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
        # AnyHttpUrl normalizes to a trailing slash; browser Origin headers
        # never have one, so CORSMiddleware's exact-match check needs it
        # stripped or every request gets silently rejected.
        allow_origins=[str(o).rstrip("/") for o in settings.cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    # Each feature registers its own router with an appropriate prefix.
    app.include_router(projects_router)
    app.include_router(health_router)
    app.include_router(events_router)
    app.include_router(analysis_router)
    app.include_router(sessions_router)
    app.include_router(timeline_router)
    from app.features.architecture_timeline.router import router as architecture_timeline_router

    app.include_router(architecture_timeline_router)
    app.include_router(insights_router)
    app.include_router(replay_router)
    app.include_router(session_health_router)
    from app.features.engineering_dna.router import router as engineering_dna_router

    app.include_router(engineering_dna_router)
    from app.features.ai_provenance.router import router as ai_provenance_router

    app.include_router(ai_provenance_router)
    from app.features.investigation.router import router as investigation_router

    app.include_router(investigation_router)
    from app.features.project_context.router import router as project_context_router

    app.include_router(project_context_router)
    from app.features.security_intelligence.router import router as security_intelligence_router

    app.include_router(security_intelligence_router)
    from app.features.predictive_intelligence.router import (
        router as predictive_intelligence_router,
    )

    app.include_router(predictive_intelligence_router)
    from app.features.project_health.router import router as project_health_router

    app.include_router(project_health_router)
    from app.features.evidence.router import router as evidence_router

    app.include_router(evidence_router)
    from app.features.knowledge_graph.router import router as knowledge_graph_router

    app.include_router(knowledge_graph_router)
    from app.features.copilot.router import router as copilot_router

    app.include_router(copilot_router)

    return app


app = create_app()
