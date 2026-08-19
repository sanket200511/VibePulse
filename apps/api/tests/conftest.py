"""
Shared test fixtures.

Tests run against a real Postgres instance (DATABASE_URL from the
environment, defaulting to the local Postgres database on port 5432) — the
events feature relies on Postgres-only column types (JSONB, native UUID)
so an in-memory SQLite substitute would not exercise the real schema.
"""

import asyncio
import functools
import time
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from app.core.config import get_settings
from app.core.database import Base, get_db, get_session_factory
from app.features.analysis.models import EventAnalysis  # noqa: F401 - registers on Base
from app.features.events.models import DevelopmentEvent
from app.features.projects.models import Project
from app.features.sessions.models import Session
from app.main import app
from fastapi import BackgroundTasks

# --- MODULE LEVEL PATCH FOR BACKGROUND TASKS ---
if not hasattr(BackgroundTasks, "_patched_for_tests"):
    BackgroundTasks._patched_for_tests = True
    BackgroundTasks._pending_tasks = 0

    orig_add_task = BackgroundTasks.add_task

    def patched_add_task(self, func, *args, **kwargs):
        BackgroundTasks._pending_tasks += 1

        # Wrap the actual function to decrement
        if asyncio.iscoroutinefunction(func):

            @functools.wraps(func)
            async def wrapper(*a, **kw):
                try:
                    return await func(*a, **kw)
                finally:
                    BackgroundTasks._pending_tasks -= 1
        else:

            @functools.wraps(func)
            def wrapper(*a, **kw):
                try:
                    return func(*a, **kw)
                finally:
                    BackgroundTasks._pending_tasks -= 1

        return orig_add_task(self, wrapper, *args, **kwargs)

    BackgroundTasks.add_task = patched_add_task
# -----------------------------------------------

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

settings = get_settings()

test_engine = create_async_engine(settings.database_url, pool_pre_ping=True)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session")
async def _schema() -> AsyncGenerator[None, None]:
    """Only pulled in by fixtures that actually touch the database."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()


@pytest_asyncio.fixture
async def _clean_rows(_schema: None) -> AsyncGenerator[None, None]:
    """
    Deletes every row written by the test that requests it (directly or
    transitively). Every test in the suite must go through this, including
    the synchronous-TestClient websocket tests -- otherwise their rows
    (written via the real, uncommitted-free get_db) persist in Postgres for
    the rest of the run and are picked up by later tests that list rows
    without a project_root filter (e.g. GET /sessions), or whose own
    project_root-scoped lookup (ADR 0005) finds a leftover session it
    shouldn't.
    """
    async with test_engine.begin() as conn:
        await conn.execute(DevelopmentEvent.__table__.delete())
        await conn.execute(Session.__table__.delete())
        await conn.execute(Project.__table__.delete())

    yield

    # Wait briefly to ensure background tasks are scheduled
    await asyncio.sleep(0.05)

    # Wait for all running background tasks to finish so we don't delete rows out from under them
    start_wait = time.time()
    while hasattr(BackgroundTasks, "_pending_tasks") and BackgroundTasks._pending_tasks > 0:
        if time.time() - start_wait > 5.0:
            print("WARNING: Timed out waiting for background tasks to finish in test teardown")
            BackgroundTasks._pending_tasks = 0
            break
        await asyncio.sleep(0.01)

    async with test_engine.begin() as conn:
        # event_analyses has ON DELETE CASCADE from event_id, so deleting
        # development_events automatically removes all child analyses.
        await conn.execute(DevelopmentEvent.__table__.delete())
        # sessions and projects are explicitly cleaned up between tests.
        await conn.execute(Session.__table__.delete())
        await conn.execute(Project.__table__.delete())


@pytest_asyncio.fixture
async def db_session(_clean_rows: None) -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
def test_session_factory() -> async_sessionmaker[AsyncSession]:
    """Session factory for tests that need to call analysis_service.dispatch directly."""
    return TestSessionLocal


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        # Mirrors production get_db(): commit after yield. Without this,
        # rows inserted via a request are only flushed, not committed, so
        # any other connection opened during the same test (e.g. a session
        # factory passed to analysis_service.dispatch(), or db_session used
        # directly in the test body) cannot see them -- the isolation level
        # a *different* Postgres connection sees is a real thing to test
        # against, not an artifact to paper over.
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = _override_get_db

    # The events router's BackgroundTasks call opens its own session via this
    # factory (get_db's session may already be closed by the time the task
    # runs). Overriding it here keeps that background session on test_engine
    # instead of the production engine -- otherwise the production engine's
    # connection pool gets touched by the pytest-asyncio session loop as a
    # side effect of a request, and disposed of at a *different* lifespan's
    # shutdown (e.g. a sync TestClient block in the websocket tests), which
    # is unsafe: asyncpg connections aren't transferable across event loops.
    app.dependency_overrides[get_session_factory] = lambda: TestSessionLocal
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
