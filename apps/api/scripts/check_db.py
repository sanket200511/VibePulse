import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main() -> None:
    try:
        from app.core.config import get_settings

        settings = get_settings()
    except Exception:
        print("FAIL_CONFIG")
        sys.exit(1)

    engine = create_async_engine(settings.database_url)
    try:
        async with engine.connect() as conn:
            # Check connection
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        err = str(e).lower()
        if "password authentication failed" in err or "password" in err:
            print("FAIL_CREDENTIALS")
        elif "database" in err and "does not exist" in err:
            print("FAIL_DB_NOT_EXIST")
        else:
            print("FAIL_CONNECTION")
        sys.exit(1)

    required_tables = ["sessions", "projects", "development_events", "event_analyses"]
    try:
        async with engine.connect() as conn:
            res = await conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )
            )
            existing_tables = {r[0] for r in res.fetchall()}
            for t in required_tables:
                if t not in existing_tables:
                    print("FAIL_SCHEMA_MISSING")
                    sys.exit(1)
    except Exception:
        print("FAIL_SCHEMA_MISSING")
        sys.exit(1)

    # Check migrations table and current version
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT version_num FROM alembic_version"))
            version = res.scalar()
            if not version:
                print("FAIL_MIGRATIONS_PENDING")
                sys.exit(1)
    except Exception:
        print("FAIL_MIGRATIONS_PENDING")
        sys.exit(1)

    print("PASS_HEALTHY")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
