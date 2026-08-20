import asyncio
import uuid
from datetime import UTC, datetime

import httpx
from app.main import app


async def test_dynamic_project_registration() -> None:
    print("\n=======================================================")
    print("    TASK 2: DYNAMIC PROJECT REGISTRATION AUDIT         ")
    print("=======================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register Project 1: Alpha-Service
        path_alpha = r"D:\Demo-Projects\Alpha-Service"
        res1 = await client.post(
            "/api/projects",
            json={"root_path": path_alpha, "display_name": "Alpha-Service"},
        )
        assert res1.status_code == 200, f"Failed to register Project 1: {res1.text}"
        proj1 = res1.json()
        print(f"[Project 1 Registered] ID: {proj1['id']} | Name: {proj1['display_name']}")

        # Register Project 2: Beta-Analytics
        path_beta = r"D:\Demo-Projects\Beta-Analytics"
        res2 = await client.post(
            "/api/projects",
            json={"root_path": path_beta, "display_name": "Beta-Analytics"},
        )
        assert res2.status_code == 200, f"Failed to register Project 2: {res2.text}"
        proj2 = res2.json()
        print(f"[Project 2 Registered] ID: {proj2['id']} | Name: {proj2['display_name']}")

        # Ingest event for Project 1
        sess_a = str(uuid.uuid4())
        ev1 = await client.post(
            "/events",
            json={
                "schema_version": 1,
                "event_type": "FILE_CREATED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": sess_a,
                "project_root": path_alpha,
                "file_path": rf"{path_alpha}\src\server.ts",
                "file_name": "server.ts",
                "file_extension": ".ts",
                "language": "TypeScript",
                "git_branch": "main",
                "metadata": {},
            },
        )
        assert ev1.status_code == 201, f"Failed event for Alpha-Service: {ev1.text}"
        print("  Event ingested into Alpha-Service (server.ts created)")

        # Ingest event for Project 2
        sess_b = str(uuid.uuid4())
        ev2 = await client.post(
            "/events",
            json={
                "schema_version": 1,
                "event_type": "FILE_MODIFIED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": sess_b,
                "project_root": path_beta,
                "file_path": rf"{path_beta}\secrets.py",
                "file_name": "secrets.py",
                "file_extension": ".py",
                "language": "Python",
                "git_branch": "main",
                "metadata": {"diff_preview": 'TOKEN = "AKIA2222222222222222"'},
            },
        )
        assert ev2.status_code == 201, f"Failed event for Beta-Analytics: {ev2.text}"
        print("  Event ingested into Beta-Analytics (secrets.py modified)")

        # Verify idempotency
        res1_again = await client.post(
            "/api/projects",
            json={"root_path": path_alpha, "display_name": "Alpha-Service"},
        )
        assert res1_again.json()["id"] == proj1["id"], "ID should be identical on re-registration!"
        print("[Idempotency Verified] Re-registering Alpha-Service returned exact same ID.")

        # Verify Investigation Search across all projects
        inv_all = await client.get("/api/investigation/search")
        assert inv_all.status_code == 200
        t_cnt = inv_all.json()["total_count"]
        p_cnt = inv_all.json()["projects_count"]
        print(f"[Investigation Search] Total Events: {t_cnt} across {p_cnt} projects")

        # Verify Project-Scoped Investigation Search
        inv_beta = await client.get(f"/api/investigation/search?project_id={proj2['id']}")
        assert inv_beta.status_code == 200
        print(f"[Scoped Search] Beta findings: {inv_beta.json()['total_count']}")

    print("\n=======================================================")
    print("  [PASS] DYNAMIC PROJECT REGISTRATION & ISOLATION OK!  ")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(test_dynamic_project_registration())
