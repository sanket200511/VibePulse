"""
Shared test fixtures.

Tests run against a real Postgres instance (DATABASE_URL from the
environment, defaulting to the local docker-compose database) — the
events feature relies on Postgres-only column types (JSONB, native UUID)
so an in-memory SQLite substitute would not exercise the real schema.
"""

from collections.abc import AsyncGenerator

import pytest_asyncio
from app.core.config import get_settings
from app.core.database import Base, get_db
from app.features.events.models import DevelopmentEvent
from app.main import app
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
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(_schema: None) -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    async with test_engine.begin() as conn:
        await conn.execute(DevelopmentEvent.__table__.delete())


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
