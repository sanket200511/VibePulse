"""
Alembic migration environment.

Uses the application's own Settings (not alembic.ini) as the source of
truth for the database URL, and imports feature models so autogenerate
can detect schema changes.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from app.core.config import get_settings
from app.core.database import Base

# Import feature models so they register on Base.metadata for autogenerate.
from app.features.events.models import DevelopmentEvent  # noqa: F401
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

settings = get_settings()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(settings.database_url)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
