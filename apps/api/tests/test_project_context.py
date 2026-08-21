import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_or_create_project_context_empty(client: AsyncClient):
    # 1. Register a project
    root_path = rf"D:\Test-Projects\Empty-{uuid.uuid4().hex[:8]}"
    p_res = await client.post("/api/projects", json={"root_path": root_path})
    assert p_res.status_code == 200
    p_id = p_res.json()["id"]

    # 2. Get Project Context
    ctx_res = await client.get(f"/api/projects/{p_id}/context")
    assert ctx_res.status_code == 200
    ctx = ctx_res.json()

    assert ctx["project_id"] == p_id
    assert ctx["project_root_path"] == root_path
    assert ctx["languages"] == {}
    assert ctx["frameworks"] == []
    assert ctx["activity_summary"]["total_events"] == 0
    assert ctx["security_summary"]["total_findings"] == 0


@pytest.mark.asyncio
async def test_project_context_derived_from_real_events(client: AsyncClient):
    root_path = rf"D:\Test-Projects\VibePulse-{uuid.uuid4().hex[:8]}"
    p_res = await client.post(
        "/api/projects", json={"root_path": root_path, "display_name": "VibePulse-App"}
    )
    assert p_res.status_code == 200
    p_id = p_res.json()["id"]
    sess_id = str(uuid.uuid4())

    # Ingest Python event (main.py)
    e1 = await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_CREATED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_id,
            "project_root": root_path,
            "file_path": rf"{root_path}\app\main.py",
            "file_name": "main.py",
            "file_extension": ".py",
            "language": "Python",
            "git_branch": "master",
            "metadata": {},
        },
    )
    assert e1.status_code == 201

    # Ingest React TSX event (App.tsx)
    e2 = await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_id,
            "project_root": root_path,
            "file_path": rf"{root_path}\src\App.tsx",
            "file_name": "App.tsx",
            "file_extension": ".tsx",
            "language": "TypeScript",
            "git_branch": "master",
            "metadata": {},
        },
    )
    assert e2.status_code == 201

    # Ingest Config event (pyproject.toml)
    e3 = await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_id,
            "project_root": root_path,
            "file_path": rf"{root_path}\pyproject.toml",
            "file_name": "pyproject.toml",
            "file_extension": ".toml",
            "language": "TOML",
            "git_branch": "master",
            "metadata": {},
        },
    )
    assert e3.status_code == 201

    # Refresh and query Project Context
    ctx_res = await client.post(f"/api/projects/{p_id}/context/refresh")
    assert ctx_res.status_code == 200
    ctx = ctx_res.json()

    # Verify Languages
    assert "Python" in ctx["languages"]
    assert "TypeScript" in ctx["languages"]

    # Verify Frameworks detected with deterministic provenance
    framework_names = [f["name"] for f in ctx["frameworks"]]
    assert "FastAPI" in framework_names
    assert "React" in framework_names

    # Verify Important Files
    important_paths = [f["path"] for f in ctx["important_files"]]
    assert any("main.py" in p for p in important_paths)

    # Verify Git context
    assert ctx["git_context"]["branch"] == "master"

    # Verify Activity Summary
    assert ctx["activity_summary"]["total_events"] >= 3


@pytest.mark.asyncio
async def test_project_context_multi_project_isolation(client: AsyncClient):
    # Project 1: Alpha (Python Backend)
    root_a = rf"D:\Test-Projects\Alpha-{uuid.uuid4().hex[:8]}"
    p_a = (
        await client.post(
            "/api/projects", json={"root_path": root_a, "display_name": "Alpha-Service"}
        )
    ).json()
    id_a = p_a["id"]
    sess_a = str(uuid.uuid4())

    await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_CREATED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_a,
            "project_root": root_a,
            "file_path": rf"{root_a}\server.py",
            "file_name": "server.py",
            "file_extension": ".py",
            "language": "Python",
            "metadata": {},
        },
    )

    # Project 2: Beta (Rust Engine)
    root_b = rf"D:\Test-Projects\Beta-{uuid.uuid4().hex[:8]}"
    p_b = (
        await client.post("/api/projects", json={"root_path": root_b, "display_name": "Beta-Core"})
    ).json()
    id_b = p_b["id"]
    sess_b = str(uuid.uuid4())

    await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_CREATED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_b,
            "project_root": root_b,
            "file_path": rf"{root_b}\engine.rs",
            "file_name": "engine.rs",
            "file_extension": ".rs",
            "language": "Rust",
            "metadata": {},
        },
    )

    # Query Context for Alpha
    ctx_a = (await client.post(f"/api/projects/{id_a}/context/refresh")).json()
    assert "Python" in ctx_a["languages"]
    assert "Rust" not in ctx_a["languages"]
    assert any("server.py" in f["path"] for f in ctx_a["important_files"])
    assert not any("engine.rs" in f["path"] for f in ctx_a["important_files"])

    # Query Context for Beta
    ctx_b = (await client.post(f"/api/projects/{id_b}/context/refresh")).json()
    assert "Rust" in ctx_b["languages"]
    assert "Python" not in ctx_b["languages"]
    assert any("engine.rs" in f["path"] for f in ctx_b["important_files"])
    assert not any("server.py" in f["path"] for f in ctx_b["important_files"])


@pytest.mark.asyncio
async def test_project_context_no_secret_leakage(client: AsyncClient):
    root_path = rf"D:\Test-Projects\SecTest-{uuid.uuid4().hex[:8]}"
    p_res = await client.post("/api/projects", json={"root_path": root_path})
    p_id = p_res.json()["id"]
    sess_id = str(uuid.uuid4())

    # Ingest event with credential in sensitive file
    await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_MODIFIED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_id,
            "project_root": root_path,
            "file_path": rf"{root_path}\config\auth.py",
            "file_name": "auth.py",
            "file_extension": ".py",
            "language": "Python",
            "metadata": {"diff_preview": 'API_KEY = "[REDACTED]"'},
        },
    )

    ctx = (await client.post(f"/api/projects/{p_id}/context/refresh")).json()

    # Raw secret tokens must never appear in project context JSON
    raw_json = str(ctx)
    assert "VIBEPULSE_DEMO_FAKE_KEY" not in raw_json
    assert any("Authentication" in pat["name"] for pat in ctx["development_patterns"])


@pytest.mark.asyncio
async def test_export_project_context_markdown(client: AsyncClient):
    root_path = rf"D:\Test-Projects\ExportDemo-{uuid.uuid4().hex[:8]}"
    p_res = await client.post(
        "/api/projects", json={"root_path": root_path, "display_name": "Export-Demo-App"}
    )
    assert p_res.status_code == 200
    p_id = p_res.json()["id"]
    sess_id = str(uuid.uuid4())

    # Ingest event with secret that should be redacted
    await client.post(
        "/events",
        json={
            "schema_version": 1,
            "event_type": "FILE_CREATED",
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": sess_id,
            "project_root": root_path,
            "file_path": rf"{root_path}\apps\api\app\main.py",
            "file_name": "main.py",
            "file_extension": ".py",
            "language": "Python",
            "git_branch": "feature/export",
            "metadata": {"diff_preview": 'api_key = "ghp_123456789012345678901234567890123456"'},
        },
    )

    # Call export endpoint
    exp_res = await client.get(f"/api/projects/{p_id}/context/export?format=markdown")
    assert exp_res.status_code == 200
    assert exp_res.headers["content-type"].startswith("text/markdown")
    assert 'attachment; filename="PROJECT_CONTEXT.md"' in exp_res.headers["content-disposition"]

    md_text = exp_res.text
    assert "# Project Context" in md_text
    assert "## 1. Project Identity" in md_text
    assert "Export-Demo-App" in md_text
    assert "## 2. Executive Summary" in md_text
    assert "## 3. Languages" in md_text
    assert "Python" in md_text
    assert "## 4. Frameworks" in md_text
    assert "FastAPI" in md_text
    assert "## 13. Security Posture" in md_text
    assert "## 14. Activity Summary" in md_text
    assert "# AI Handoff Context" in md_text
    assert "## What VibePulse Knows" in md_text
    assert "## Unknown / Not Yet Observed" in md_text
    assert "## Recommended First Questions for an AI Agent" in md_text
    assert "## Context Provenance" in md_text

    # Verify secret is strictly redacted
    assert "ghp_123456789012345678901234567890123456" not in md_text
    assert "[REDACTED]" in md_text
