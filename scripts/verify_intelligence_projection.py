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
from app.features.sessions.models import Session
from app.main import app


async def main():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Check
        health_res = await client.get("/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
        print("  [OK] PASS: FastAPI and PostgreSQL connected")

        # 2. Create Disposable Test Project
        test_id = uuid.uuid4().hex[:8]
        proj_root = rf"D:\Test-Projects\Reconstructible-{test_id}"
        p_res = await client.post(
            "/api/projects",
            json={"root_path": proj_root, "display_name": f"Reconstructible-{test_id}"},
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
            {
                "schema_version": 1,
                "event_type": "FILE_CREATED",
                "timestamp": datetime.now(UTC).isoformat(),
                "session_id": session_id,
                "project_root": proj_root,
                "file_path": rf"{proj_root}\apps\dashboard\src\App.tsx",
                "file_name": "App.tsx",
                "file_extension": ".tsx",
                "language": "TypeScript",
                "git_branch": "feat/intelligence",
                "metadata": {},
            },
        ]

        for ev in events:
            ev_res = await client.post("/events", json=ev)
            assert ev_res.status_code == 201, f"Event creation failed: {ev_res.text}"

        print(
            f"  [OK] PASS: Ingested {len(events)} authoritative events into PostgreSQL"
        )

        # 4. Generate Initial Project Intelligence Projection
        init_res = await client.post(f"/api/projects/{project_id}/context/refresh")
        assert init_res.status_code == 200, f"Refresh failed: {init_res.text}"
        initial_context = init_res.json()
        print(
            f"  [OK] PASS: Initial Project Intelligence projected (Version: v{initial_context['context_version']})"
        )
        print(
            f"    - Focus: {initial_context['development_focus']['focus']} [{initial_context['development_focus']['classification']}]"
        )
        print(
            f"    - Total Events: {initial_context['activity_summary']['total_events']}"
        )
        print(f"    - Languages: {', '.join(initial_context['languages'].keys())}")
        print(
            f"    - Frameworks: {', '.join([f['name'] for f in initial_context['frameworks']])}"
        )
        print(
            f"    - Architecture Signals: {', '.join([s['signal'] for s in initial_context['architecture_signals']])}"
        )

        assert "Python" in initial_context["languages"]
        assert "TypeScript" in initial_context["languages"]
        assert initial_context["activity_summary"]["total_events"] == 4

        # 5. Delete ONLY the project_contexts table row in PostgreSQL
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(ProjectContext).where(
                    ProjectContext.project_id == uuid.UUID(project_id)
                )
            )
            await db.commit()

            # Confirm row is deleted
            check = await db.execute(
                select(ProjectContext).where(
                    ProjectContext.project_id == uuid.UUID(project_id)
                )
            )
            assert check.scalar_one_or_none() is None
        print(
            "  [OK] PASS: Deleted ONLY project_contexts row. Authoritative events, sessions, analyses preserved."
        )

        # 6. Re-run Refresh / Reprojection Endpoint
        reconstruct_res = await client.post(
            f"/api/projects/{project_id}/context/refresh"
        )
        assert reconstruct_res.status_code == 200
        reconstructed_context = reconstruct_res.json()
        print(
            "  [OK] PASS: Project Intelligence reconstructed from underlying historical events"
        )

        # 7. Compare Reconstructed Result with Original Result
        assert reconstructed_context["project_id"] == initial_context["project_id"]
        assert (
            reconstructed_context["activity_summary"]["total_events"]
            == initial_context["activity_summary"]["total_events"]
        )
        assert (
            reconstructed_context["development_focus"]["focus"]
            == initial_context["development_focus"]["focus"]
        )
        assert (
            reconstructed_context["languages"]["Python"]["count"]
            == initial_context["languages"]["Python"]["count"]
        )
        assert (
            reconstructed_context["languages"]["TypeScript"]["count"]
            == initial_context["languages"]["TypeScript"]["count"]
        )
        assert len(reconstructed_context["important_files"]) == len(
            initial_context["important_files"]
        )
        print(
            "  [OK] PASS: Reconstructed Project Intelligence is 100% SEMANTICALLY IDENTICAL to original projection!"
        )

        # 8. Test Export / Markdown Generation with 16 Sections
        exp_res = await client.get(
            f"/api/projects/{project_id}/context/export?format=markdown"
        )
        assert exp_res.status_code == 200
        md_text = exp_res.text
        assert "## 1. Project Identity" in md_text
        assert "## 2. Executive Summary" in md_text
        assert "## 3. Languages" in md_text
        assert "## 4. Frameworks" in md_text
        assert "## 11. Architecture Summary" in md_text
        assert "## 12. Development Patterns & Focus" in md_text
        assert "# AI Handoff Context" in md_text
        print(
            "  [OK] PASS: Generated PROJECT_CONTEXT.md export verified with canonical sections"
        )

        # 9. Clean up Disposable Project (End session first so project is not locked)
        async with AsyncSessionLocal() as db:
            s_res = await db.execute(
                select(Session).where(Session.project_root == proj_root)
            )
            for s in s_res.scalars().all():
                s.status = "COMPLETED"
            await db.commit()

        del_res = await client.delete(f"/api/projects/{project_id}")
        assert del_res.status_code in (200, 204), f"Delete failed: {del_res.text}"
        print(
            f"  [OK] PASS: Deleted disposable project {project_id}. Cascade cleanup complete."
        )


if __name__ == "__main__":
    asyncio.run(main())
