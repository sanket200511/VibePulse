import asyncio
import uuid
from datetime import datetime, timezone
import httpx
from app.main import app
from app.core.database import get_session_factory
from sqlalchemy import text

async def run_persistence_test():
    print("\n=======================================================")
    print("      VIBEPULSE REAL POSTGRESQL PERSISTENCE TEST       ")
    print("=======================================================\n")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Phase 1: Register Project A
        proj_resp = await client.post("/api/projects", json={"root_path": r"D:\VibePulse-Demo"})
        assert proj_resp.status_code == 200, f"Project registration failed: {proj_resp.text}"
        project_id = proj_resp.json()["id"]
        print(f"[Phase 1] Project registered: {project_id} ({proj_resp.json()['display_name']})")

        # Phase 2: Create Session 1 with 3 events
        sess1_id = str(uuid.uuid4())
        print(f"\n[Phase 2] Starting Session 1 (Daemon Session: {sess1_id})")
        
        # Event 1: Normal file created
        e1_resp = await client.post("/events", json={
            "schema_version": 1,
            "event_type": "FILE_CREATED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": sess1_id,
            "project_root": r"D:\VibePulse-Demo",
            "file_path": r"D:\VibePulse-Demo\src\auth.py",
            "file_name": "auth.py",
            "language": "Python",
            "metadata": {}
        })
        assert e1_resp.status_code == 201
        print("  Event 1 ingested (auth.py created)")

        # Event 2: Secret added in config/settings.py
        e2_resp = await client.post("/events", json={
            "schema_version": 1,
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": sess1_id,
            "project_root": r"D:\VibePulse-Demo",
            "file_path": r"D:\VibePulse-Demo\config\settings.py",
            "file_name": "settings.py",
            "language": "Python",
            "metadata": {}
        })
        assert e2_resp.status_code == 201
        print("  Event 2 ingested (settings.py modified with credential)")

        # Event 3: Stop observation on Session 1 (simulating daemon restart)
        e3_resp = await client.post("/events", json={
            "schema_version": 1,
            "event_type": "OBSERVATION_STOPPED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": sess1_id,
            "project_root": r"D:\VibePulse-Demo",
            "metadata": {}
        })
        assert e3_resp.status_code == 201
        print("  Event 3 ingested (OBSERVATION_STOPPED - Session 1 finalized)")

        await asyncio.sleep(0.5)

        # Verify state after Session 1
        factory = get_session_factory()
        async with factory() as db:
            p_count = (await db.execute(text("SELECT COUNT(*) FROM projects"))).scalar()
            s_count = (await db.execute(text("SELECT COUNT(*) FROM sessions"))).scalar()
            e_count = (await db.execute(text("SELECT COUNT(*) FROM development_events"))).scalar()
            print(f"\n[PostgreSQL Counts after Session 1] Projects: {p_count} | Sessions: {s_count} | Events: {e_count}")

        # Phase 3: Simulate Daemon Restart & Start Session 2 for the same project
        sess2_id = str(uuid.uuid4())
        print(f"\n[Phase 3] Daemon restarted! Starting Session 2 (Daemon Session: {sess2_id})")

        # Idempotent project ensure
        proj2_resp = await client.post("/api/projects", json={"root_path": r"D:\VibePulse-Demo"})
        assert proj2_resp.status_code == 200
        assert proj2_resp.json()["id"] == project_id, "Project ID changed! Project must be reused."
        print(f"  Project re-ensured idempotently: {project_id}")

        # Ingest events in Session 2
        e4_resp = await client.post("/events", json={
            "schema_version": 1,
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": sess2_id,
            "project_root": r"D:\VibePulse-Demo",
            "file_path": r"D:\VibePulse-Demo\src\api.py",
            "file_name": "api.py",
            "language": "Python",
            "metadata": {}
        })
        assert e4_resp.status_code == 201
        print("  Event 4 ingested (api.py modified in Session 2)")

        await asyncio.sleep(0.5)

        # Phase 4: Query Database & API Endpoints to verify multi-session persistence
        print("\n[Phase 4] Verifying Historical Multi-Session Persistence...")
        
        # 1. Projects API
        p_api = await client.get("/api/projects")
        projects_list = p_api.json()["projects"]
        print(f"  GET /api/projects returned {len(projects_list)} project(s): {[p['display_name'] for p in projects_list]}")
        demo_projects = [p for p in projects_list if p["root_path"] == r"D:\VibePulse-Demo"]
        assert len(demo_projects) == 1, f"Expected exactly 1 project for D:\\VibePulse-Demo, found {len(demo_projects)}"

        # 2. Sessions History API
        s_api = await client.get("/sessions")
        sessions_list = s_api.json()["sessions"]
        print(f"  GET /sessions returned {len(sessions_list)} session(s):")
        for s in sessions_list:
            print(f"    • Session {s['id'][:8]}... | Status: {s['status']} | Events: {s['event_count']} | Started: {s['started_at']}")
        assert len(sessions_list) >= 2, f"Expected at least 2 sessions, got {len(sessions_list)}"

        # 3. Investigation Search API
        inv_api = await client.get("/api/investigation/search")
        inv_data = inv_api.json()
        print(f"  GET /api/investigation/search returned {inv_data['total_count']} total events across {inv_data['sessions_count']} session(s)")
        assert inv_data["total_count"] >= 4, "Historical events missing from investigation search!"

        # 4. Direct Database Row Verification
        async with factory() as db:
            p_final = (await db.execute(text("SELECT COUNT(*) FROM projects"))).scalar()
            s_final = (await db.execute(text("SELECT COUNT(*) FROM sessions"))).scalar()
            e_final = (await db.execute(text("SELECT COUNT(*) FROM development_events"))).scalar()
            print(f"\n[Final PostgreSQL Verification]")
            print(f"  Total Projects in DB : {p_final}")
            print(f"  Total Sessions in DB : {s_final}")
            print(f"  Total Events in DB   : {e_final}")
            assert p_final >= 1, f"Expected >=1 project, found {p_final}"
            assert s_final >= 2, f"Expected >=2 sessions, found {s_final}"
            assert e_final >= 4, f"Expected >=4 events, found {e_final}"

    print("\n=======================================================")
    print("      [PASS] ALL PERSISTENCE INVARIANTS SATISFIED!     ")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_persistence_test())
