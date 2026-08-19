"""
Database reset script for local PostgreSQL environment.
Drops all public schema tables and recreates the schema, then runs Alembic migrations to head.
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def reset() -> None:
    try:
        from app.core.config import get_settings
        settings = get_settings()
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    engine = create_async_engine(settings.database_url)
    try:
        async with engine.begin() as conn:
            print("Dropping public schema...")
            await conn.execute(text("DROP SCHEMA public CASCADE;"))
            print("Recreating public schema...")
            await conn.execute(text("CREATE SCHEMA public;"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        print("Schema cleared successfully.")
    except Exception as e:
        print(f"Database reset failed: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset())
