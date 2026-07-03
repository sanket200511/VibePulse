"""
Database session management.

Uses SQLAlchemy 2.x async engine + session factory.
Actual models and migrations are defined in future feature modules.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────────────

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ───────────────────────────────────────────────────────────

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)

# ── Base model ────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


# ── Dependency ────────────────────────────────────────────────────────────────


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session per request.
    The session is committed on success and rolled back on exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
