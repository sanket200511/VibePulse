"""
VibePulse API – Application entry point.

Wires together FastAPI, middleware, and feature routers.
Business logic lives exclusively inside feature modules.
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.features.health.router import router as health_router

settings = get_settings()


# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Startup: initialise connection pools, caches, background workers.
    Shutdown: flush buffers, close connections gracefully.
    """
    # TODO(sprint-1): initialise database engine
    # TODO(sprint-1): initialise Redis client
    print("✅  VibePulse API starting up…")
    yield
    print("🛑  VibePulse API shutting down…")


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

    # TODO(sprint-1): app.include_router(events_router, prefix="/api/v1")

    return app


app = create_app()
