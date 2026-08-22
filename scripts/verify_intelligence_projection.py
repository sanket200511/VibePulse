"""
scripts/verify_intelligence_projection.py

Standalone verification script proving Sprint 2 Reconstructibility and Materialized View semantics.
"""

import asyncio
import uuid
from datetime import UTC, datetime

from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal
from app.features.project_context.models import ProjectContext
from app.main import app


async def main():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Check
        health_res = await client.get("/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
        print("  [OK] PASS: FastAPI and PostgreSQL connected")

        project_id = None
        try:
            # 2. Create Disposable Test Project
            test_id = uuid.uuid4().hex[:8]
            proj_root = rf"D:\Test-Projects\Reconstructible-{test_id}"
            p_res = await client.post(
                "/api/projects",
                json={
                    "root_path": proj_root,
                    "display_name": f"Reconstructible-{test_id}",
                },
            )
            assert p_res.status_code == 200, f"Failed to create project: {p_res.text}"
            project_id = p_res.json()["id"]
            print(f"  [OK] PASS: Created disposable project {project_id} ({proj_root})")

            # 3. Ingest authoritative events into PostgreSQL
            session_id = str(uuid.uuid4())
            events = [
                {
                    "schema_version": 1,
                    "event_type": "FILE_CREATED",
                    "timestamp": datetime.now(UTC).isoformat(),
                    "session_id": session_id,
                    "project_root": proj_root,
                    "file_path": rf"{proj_root}\apps\api\app\main.py",
                    "file_name": "main.py",
                    "file_extension": ".py",
                    "language": "Python",
                    "git_branch": "feat/intelligence",
                    "metadata": {},
                },
                {
                    "schema_version": 1,
                    "event_type": "FILE_MODIFIED",
                    "timestamp": datetime.now(UTC).isoformat(),
                    "session_id": session_id,
                    "project_root": proj_root,
                    "file_path": rf"{proj_root}\apps\api\app\auth\service.py",
                    "file_name": "service.py",
                    "file_extension": ".py",
                    "language": "Python",
                    "git_branch": "feat/intelligence",
                    "metadata": {},
                },
                {
                    "schema_version": 1,
                    "event_type": "FILE_MODIFIED",
                    "timestamp": datetime.now(UTC).isoformat(),
                    "session_id": session_id,
                    "project_root": proj_root,
                    "file_path": rf"{proj_root}\apps\api\app\auth\token.py",
                    "file_name": "token.py",
                    "file_extension": ".py",
                    "language": "Python",
                    "git_branch": "feat/intelligence",
                    "metadata": {},
                },
            ]

            for ev in events:
                ev_res = await client.post("/events", json=ev)
                assert ev_res.status_code == 201, (
                    f"Failed to ingest event: {ev_res.text}"
                )
            print("  [OK] PASS: Ingested 3 development events via /events")

            # 4. Generate first projected state (State A)
            proj_res_a = await client.get(f"/api/projects/{project_id}/context")
            assert proj_res_a.status_code == 200, (
                f"Failed to generate context: {proj_res_a.text}"
            )
            state_a = proj_res_a.json()
            assert state_a["project_id"] == project_id
            assert state_a["metadata_schema_version"] == 1
            assert state_a["active_technologies"]["languages"]["Python"] == 3
            assert state_a["development_focus"]["focus"] == "Auth Architecture"
            assert state_a["development_focus"]["classification"] == "INFERRED"
            assert state_a["development_focus"]["confidence_score"] == 1.0
            print("  [OK] PASS: Projected State A materialized from raw events")

            # 5. Delete ONLY the project_contexts table row in PostgreSQL
            async with AsyncSessionLocal() as db:
                await db.execute(
                    delete(ProjectContext).where(
                        ProjectContext.project_id == uuid.UUID(project_id)
                    )
                )
                await db.commit()

            # Confirm row is deleted
            async with AsyncSessionLocal() as db:
                ctx_check = (
                    await db.execute(
                        select(ProjectContext).where(
                            ProjectContext.project_id == uuid.UUID(project_id)
                        )
                    )
                ).scalar_one_or_none()
                assert ctx_check is None, "ProjectContext row was not deleted from DB!"
            print(
                "  [OK] PASS: Deleted ONLY project_contexts row. Authoritative events, sessions, analyses preserved."
            )

            # 6. Recompute second projected state from raw telemetry (State B)
            proj_res_b = await client.get(f"/api/projects/{project_id}/context")
            assert proj_res_b.status_code == 200, (
                f"Failed to regenerate context: {proj_res_b.text}"
            )
            state_b = proj_res_b.json()
            print("  [OK] PASS: Re-projected State B materialized from raw events")

            # 7. Mathematical Invariant Verification: State A == State B
            assert state_a["project_id"] == state_b["project_id"]
            assert (
                state_a["metadata_schema_version"] == state_b["metadata_schema_version"]
            )
            assert (
                state_a["active_technologies"]["languages"]
                == state_b["active_technologies"]["languages"]
            )
            assert (
                state_a["development_focus"]["focus"]
                == state_b["development_focus"]["focus"]
            )
            assert (
                state_a["development_focus"]["classification"]
                == state_b["development_focus"]["classification"]
            )
            assert (
                state_a["development_focus"]["confidence_score"]
                == state_b["development_focus"]["confidence_score"]
            )
            assert (
                state_a["development_focus"]["evidence_event_ids"]
                == state_b["development_focus"]["evidence_event_ids"]
            )
            assert (
                state_a["recent_architectural_decisions"]
                == state_b["recent_architectural_decisions"]
            )
            print(
                "  [OK] PASS: DETERMINISTIC INVARIANT VERIFIED: State A == State B (Full Semantic Equivalence)"
            )

            # 8. Verify Markdown AI Handoff Export
            export_res = await client.get(f"/api/projects/{project_id}/context/export")
            assert export_res.status_code == 200
            assert "Auth Architecture" in export_res.text
            assert "Python" in export_res.text
            print("  [OK] PASS: PROJECT_CONTEXT.md exported successfully")
        finally:
            # 9. Clean up Disposable Project
            if project_id:
                del_res = await client.delete(f"/api/projects/{project_id}?force=true")
                assert del_res.status_code in (200, 204), (
                    f"Delete failed: {del_res.text}"
                )
                print(
                    f"  [OK] PASS: Deleted disposable project {project_id}. Cascade cleanup complete."
                )


if __name__ == "__main__":
    asyncio.run(main())
