import asyncio
import uuid
from datetime import UTC, datetime

import httpx
from app.core.database import AsyncSessionLocal
from app.main import app
from sqlalchemy import text


async def run_persistence_test() -> None:
    print("\n=======================================================")
    print("      VIBEPULSE REAL POSTGRESQL PERSISTENCE TEST       ")
    print("=======================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Phase 1: Register Project
        p_res = await client.post(
            "/api/projects",
            json={"root_path": r"D:\DepRadar-Demo", "display_name": "DepRadar-Demo"},
        )
        assert p_res.status_code == 200, f"Project registration failed: {p_res.text}"
        project_id = p_res.json()["id"]
        print(f"\n[Phase 1] Project registered: {project_id} (DepRadar-Demo)")

        # Phase 2: Start Session 1 and Ingest Events
        sess1_id = str(uuid.uuid4())
        print(f"\n[Phase 2] Starting Session 1 (Daemon Session: {sess1_id})")

        e1 = await client.post(
            "/events",
            json={
                "schema_version": 1,
                "event_type": "FILE_CREATED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": sess1_id,
                "project_root": r"D:\DepRadar-Demo",
                "file_path": r"D:\DepRadar-Demo\src\auth.py",
                "file_name": "auth.py",
                "file_extension": ".py",
                "language": "Python",
                "git_branch": "main",
                "metadata": {},
            },
        )
        assert e1.status_code == 201, f"Event 1 failed: {e1.text}"
        print("  Event 1 ingested (auth.py created)")

        e2 = await client.post(
            "/events",
            json={
                "schema_version": 1,
                "event_type": "FILE_MODIFIED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": sess1_id,
                "project_root": r"D:\DepRadar-Demo",
                "file_path": r"D:\DepRadar-Demo\src\settings.py",
                "file_name": "settings.py",
                "file_extension": ".py",
                "language": "Python",
                "git_branch": "main",
                "metadata": {"diff_preview": 'SECRET_KEY = "AKIA1111111111111111"'},
            },
        )
        assert e2.status_code == 201, f"Event 2 failed: {e2.text}"
        print("  Event 2 ingested (settings.py modified with credential)")

        e3 = await client.post(
            "/events",
            json={
                "schema_version": 1,
                "event_type": "OBSERVATION_STOPPED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": sess1_id,
                "project_root": r"D:\DepRadar-Demo",
                "file_path": r"D:\DepRadar-Demo",
                "file_name": "DepRadar-Demo",
                "file_extension": "",
                "language": "",
                "git_branch": "main",
                "metadata": {},
            },
        )
        assert e3.status_code == 201, f"Event 3 failed: {e3.text}"
        print("  Event 3 ingested (OBSERVATION_STOPPED - Session 1 finalized)")

        # Verify Counts in PostgreSQL
        async with AsyncSessionLocal() as db:
            p_count = (await db.execute(text("SELECT COUNT(*) FROM projects"))).scalar()
            s_count = (await db.execute(text("SELECT COUNT(*) FROM sessions"))).scalar()
            e_count = (await db.execute(text("SELECT COUNT(*) FROM development_events"))).scalar()
            print(
                f"\n[PostgreSQL Counts after Session 1] "
                f"Projects: {p_count} | Sessions: {s_count} | Events: {e_count}"
            )

        # Phase 3: Simulate Daemon Restart & Start Session 2 for the same project
        sess2_id = str(uuid.uuid4())
        print(f"\n[Phase 3] Daemon restarted! Starting Session 2 (Daemon Session: {sess2_id})")

        p_re_res = await client.post(
            "/api/projects",
            json={"root_path": r"D:\DepRadar-Demo", "display_name": "DepRadar-Demo"},
        )
        assert p_re_res.status_code == 200
        assert p_re_res.json()["id"] == project_id, "Project ID should be durable and idempotent!"
        print(f"  Project re-ensured idempotently: {project_id}")

        e4 = await client.post(
            "/events",
            json={
                "schema_version": 1,
                "event_type": "FILE_MODIFIED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": sess2_id,
                "project_root": r"D:\DepRadar-Demo",
                "file_path": r"D:\DepRadar-Demo\src\api.py",
                "file_name": "api.py",
                "file_extension": ".py",
                "language": "Python",
                "git_branch": "main",
                "metadata": {},
            },
        )
        assert e4.status_code == 201, f"Event 4 failed: {e4.text}"
        print("  Event 4 ingested (api.py modified in Session 2)")

        # Phase 4: Query Database & API Endpoints to verify multi-session persistence
        print("\n[Phase 4] Verifying Historical Multi-Session Persistence...")

        # 1. Projects API
        p_api = await client.get("/api/projects")
        assert p_api.status_code == 200
        projects_list = p_api.json()["projects"]
        names = [p["display_name"] for p in projects_list]
        print(f"  GET /api/projects returned {len(projects_list)} project(s): {names}")
        demo_projects = [p for p in projects_list if p["root_path"] == r"D:\DepRadar-Demo"]
        assert len(demo_projects) == 1, (
            f"Expected exactly 1 project for D:\\DepRadar-Demo, found {len(demo_projects)}"
        )

        # 2. Sessions History API
        s_api = await client.get("/sessions")
        assert s_api.status_code == 200
        sessions_list = s_api.json()
        print(f"  GET /sessions returned {len(sessions_list)} session(s):")
        for s in sessions_list:
            s_short = f"{s['id'][:8]}..."
            print(
                f"    - Session {s_short} | Status: {s['status']} | "
                f"Events: {s['event_count']} | Started: {s['started_at']}"
            )
        assert len(sessions_list) >= 2, f"Expected at least 2 sessions, got {len(sessions_list)}"

        # 3. Investigation Search API
        inv_api = await client.get("/api/investigation/search")
        assert inv_api.status_code == 200
        inv_data = inv_api.json()
        t_cnt = inv_data["total_count"]
        s_cnt = inv_data["sessions_count"]
        print(f"  GET /api/investigation/search: {t_cnt} events across {s_cnt} sessions")
        assert inv_data["total_count"] >= 4, "Historical events missing from investigation search!"

        # Phase 5: Direct DB Counts
        async with AsyncSessionLocal() as db:
            p_final = (await db.execute(text("SELECT COUNT(*) FROM projects"))).scalar()
            s_final = (await db.execute(text("SELECT COUNT(*) FROM sessions"))).scalar()
            e_final = (await db.execute(text("SELECT COUNT(*) FROM development_events"))).scalar()
            print("\n[Final PostgreSQL Verification]")
            print(f"  Total Projects in DB : {p_final}")
            print(f"  Total Sessions in DB : {s_final}")
            print(f"  Total Events in DB   : {e_final}")

    print("\n=======================================================")
    print("      [PASS] ALL PERSISTENCE INVARIANTS SATISFIED!     ")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(run_persistence_test())
