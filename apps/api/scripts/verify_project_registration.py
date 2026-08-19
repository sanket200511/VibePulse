import asyncio
import uuid
from datetime import datetime, timezone
import httpx
from app.main import app

async def test_dynamic_project_registration():
    print("\n=======================================================")
    print("    TASK 2: DYNAMIC PROJECT REGISTRATION AUDIT         ")
    print("=======================================================\n")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register Directory 1: Alpha
        path_alpha = r"D:\Demo-Projects\Alpha-Service"
        res_a = await client.post("/api/projects", json={"root_path": path_alpha})
        assert res_a.status_code == 200, f"Alpha reg failed: {res_a.text}"
        id_a = res_a.json()["id"]
        name_a = res_a.json()["display_name"]
        print(f"[Project 1 Registered] ID: {id_a} | Name: {name_a} | Path: {path_alpha}")

        # 2. Register Directory 2: Beta
        path_beta = r"D:\Demo-Projects\Beta-Analytics"
        res_b = await client.post("/api/projects", json={"root_path": path_beta})
        assert res_b.status_code == 200, f"Beta reg failed: {res_b.text}"
        id_b = res_b.json()["id"]
        name_b = res_b.json()["display_name"]
        print(f"[Project 2 Registered] ID: {id_b} | Name: {name_b} | Path: {path_beta}")
        assert id_a != id_b, "Project IDs must be distinct for different roots!"

        # 3. Ingest Telemetry into Alpha
        sess_a = str(uuid.uuid4())
        e_a = await client.post("/events", json={
            "schema_version": 1,
            "event_type": "FILE_CREATED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": sess_a,
            "project_root": path_alpha,
            "file_path": rf"{path_alpha}\src\server.ts",
            "file_name": "server.ts",
            "language": "TypeScript",
            "metadata": {}
        })
        assert e_a.status_code == 201
        print("  Event ingested into Alpha-Service (server.ts created)")

        # 4. Ingest Telemetry + Secret into Beta
        sess_b = str(uuid.uuid4())
        e_b = await client.post("/events", json={
            "schema_version": 1,
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": sess_b,
            "project_root": path_beta,
            "file_path": rf"{path_beta}\config\secrets.py",
            "file_name": "secrets.py",
            "language": "Python",
            "metadata": {}
        })
        assert e_b.status_code == 201
        print("  Event ingested into Beta-Analytics (secrets.py modified)")

        await asyncio.sleep(0.5)

        # 5. Verify Idempotent Re-Registration of Alpha
        res_a_again = await client.post("/api/projects", json={"root_path": path_alpha})
        assert res_a_again.status_code == 200
        assert res_a_again.json()["id"] == id_a, "Re-registration must return identical project ID!"
        print("[Idempotency Verified] Re-registering Alpha-Service returned exact same ID.")

        # 6. Verify Project Scoping in Investigation Search
        inv_all = await client.get("/api/investigation/search")
        assert inv_all.status_code == 200
        print(f"[Investigation Search] Total Events: {inv_all.json()['total_count']} across {inv_all.json()['projects_count']} projects")

        # Project-scoped investigation search
        inv_beta = await client.get(f"/api/projects/{id_b}/investigation/search")
        assert inv_beta.status_code == 200
        beta_results = inv_beta.json()["results"]
        print(f"[Scoped Search] Beta-Analytics investigation results count: {len(beta_results)}")
        for r in beta_results:
            assert r["project_root"] == path_beta, "Scoped search leaked events from outside Beta!"

    print("\n=======================================================")
    print("  [PASS] DYNAMIC PROJECT REGISTRATION & ISOLATION OK!  ")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(test_dynamic_project_registration())
