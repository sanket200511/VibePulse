import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def audit_db():
    async with AsyncSessionLocal() as session:
        # Tables
        res = await session.execute(
            text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
            )
        )
        tables = [r[0] for r in res.fetchall()]
        print("PUBLIC TABLES:", tables)

        # Row counts & schema info
        for t in tables:
            cnt_res = await session.execute(text(f"SELECT COUNT(*) FROM {t};"))
            cnt = cnt_res.scalar()
            print(f"  - Table '{t}': {cnt} rows")

        # Foreign Keys
        fk_sql = """
        SELECT
            tc.table_name, kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
        """
        fks = await session.execute(text(fk_sql))
        print("\nFOREIGN KEYS:")
        for fk in fks.fetchall():
            print(f"  - {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]} (ON DELETE {fk[4]})")

        # Indexes
        idx_sql = """
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
        """
        idxs = await session.execute(text(idx_sql))
        print("\nINDEXES:")
        for idx in idxs.fetchall():
            print(f"  - {idx[0]}: {idx[1]} -> {idx[2]}")


if __name__ == "__main__":
    asyncio.run(audit_db())
