"""
Sprint 10 Engineering Knowledge Graph & Project Memory 2.0 Integration Tests.

Validates:
1. Deterministic Knowledge Graph node and edge projection
2. Explicit semantic relationships (CONTAINS, BELONGS_TO, ASSOCIATED_WITH,
   CONTRIBUTED_TO, AFFECTS, RESOLVED_BY)
3. File Intelligence & Subsystem Intelligence views
4. Project Memory 2.0 structured AI model
5. Multi-entity deterministic search
6. Secret masking (zero raw leakage of VIBEPULSE_SPRINT10_SECRET_2026)
7. Multi-project isolation (Project A vs Project B)
8. Deterministic Reconstructibility (Result A == Result B)
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.features.events.constants import EventType
from app.features.events.schemas import DevelopmentEventCreate
from app.features.events.service import create_event
from app.features.investigation.models import IncidentReviewHistory
from app.features.knowledge_graph.service import (
    build_project_knowledge_graph,
    clear_knowledge_graph_cache,
    get_file_intelligence,
    get_or_create_knowledge_graph,
    get_project_memory,
    get_subsystem_intelligence,
    search_knowledge_graph,
)
from app.features.projects.service import get_or_create_project
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_knowledge_graph_projection_and_relationships(db_session: AsyncSession, tmp_path):
    """Verify nodes, edges, file intelligence, and subsystem views are synthesized correctly."""
    proj_dir = tmp_path / "kg_proj_main"
    proj_dir.mkdir(parents=True, exist_ok=True)
    (proj_dir / "src" / "auth").mkdir(parents=True, exist_ok=True)
    auth_file = proj_dir / "src" / "auth" / "login.py"
    auth_file.write_text("def login():\n    pass\n")

    proj = await get_or_create_project(db_session, str(proj_dir), "KG Main Project")
    sess_id = uuid.uuid4()
    now = datetime.now(tz=UTC)

    # Ingest event
    ev_payload = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.FILE_MODIFIED,
        timestamp=now - timedelta(minutes=10),
        session_id=sess_id,
        project_root=proj.root_path,
        file_path="src/auth/login.py",
        file_name="login.py",
        file_extension=".py",
        language="Python",
        metadata={"diff": "+ def authenticate(): pass"},
    )
    await create_event(db_session, ev_payload)
    await db_session.commit()

    # Build knowledge graph
    graph = await build_project_knowledge_graph(db_session, proj.id)

    assert graph.project_id == proj.id
    assert graph.total_nodes >= 3  # Project, Subsystem, File, HealthDimensions
    assert graph.total_edges >= 2

    # Check node types
    node_types = {n.node_type for n in graph.nodes}
    assert "Project" in node_types
    assert "Subsystem" in node_types
    assert "File" in node_types
    assert "HealthDimension" in node_types

    # Check relationships
    rel_types = {e.relationship_type for e in graph.edges}
    assert "CONTAINS" in rel_types
    assert "BELONGS_TO" in rel_types

    # File intelligence
    file_intel = await get_file_intelligence(db_session, proj.id, "src/auth/login.py")
    assert file_intel.file_path == "src/auth/login.py"
    assert file_intel.subsystem == "Authentication"
    assert file_intel.activity_count >= 1
    assert file_intel.provenance == "OBSERVED"

    # Subsystem intelligence
    subsys_intel = await get_subsystem_intelligence(db_session, proj.id, "Authentication")
    assert subsys_intel.subsystem_name == "Authentication"
    assert subsys_intel.file_count >= 1
    assert "src/auth/login.py" in subsys_intel.files


@pytest.mark.asyncio
async def test_project_memory_and_deterministic_search(db_session: AsyncSession, tmp_path):
    """Verify Project Memory 2.0 AI model and deterministic multi-entity search."""
    proj_dir = tmp_path / "kg_proj_search"
    proj_dir.mkdir(parents=True, exist_ok=True)
    proj = await get_or_create_project(db_session, str(proj_dir), "Search Test Project")

    sess_id = uuid.uuid4()
    now = datetime.now(tz=UTC)

    # Ingest database file event
    ev_payload = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.FILE_MODIFIED,
        timestamp=now - timedelta(minutes=5),
        session_id=sess_id,
        project_root=proj.root_path,
        file_path="src/database/models.py",
        file_name="models.py",
        file_extension=".py",
        language="Python",
        metadata={"diff": "+ class User(Base): pass"},
    )
    await create_event(db_session, ev_payload)
    await db_session.commit()

    # Memory 2.0
    memory = await get_project_memory(db_session, proj.id)
    assert memory.project_id == proj.id
    assert "src/database/models.py" in memory.important_files
    assert "Database" in memory.subsystems
    assert memory.health_grade is not None

    # Deterministic search
    search_res = await search_knowledge_graph(db_session, proj.id, "database")
    assert len(search_res) > 0
    assert any(r.subsystem == "Database" or "database" in r.label.lower() for r in search_res)


@pytest.mark.asyncio
async def test_secret_safety_in_knowledge_graph(db_session: AsyncSession, tmp_path):
    """
    Verify secret token VIBEPULSE_SPRINT10_SECRET_2026 is strictly masked across
    nodes, edges, and memory.
    """
    secret_token = "VIBEPULSE_SPRINT10_SECRET_2026"
    proj_dir = tmp_path / "kg_proj_secret"
    proj_dir.mkdir(parents=True, exist_ok=True)
    proj = await get_or_create_project(db_session, str(proj_dir), "Secret Safety Project")

    # Ingest review history with secret in note
    hist = IncidentReviewHistory(
        project_id=proj.id,
        incident_id="INC-SEC-TEST",
        previous_status="OPEN",
        new_status="RESOLVED",
        reviewer="SecLead",
        resolution_note=f"Rotated key {secret_token} to secure vault",
        created_at=datetime.now(tz=UTC),
    )
    db_session.add(hist)
    await db_session.commit()

    graph = await build_project_knowledge_graph(db_session, proj.id)
    graph_dump = graph.model_dump_json()

    assert secret_token not in graph_dump
    assert "[REDACTED]" in graph_dump

    memory = await get_project_memory(db_session, proj.id)
    memory_dump = memory.model_dump_json()
    assert secret_token not in memory_dump


@pytest.mark.asyncio
async def test_project_isolation_and_reconstructibility(db_session: AsyncSession, tmp_path):
    """Verify Project A activity never leaks into Project B, and Result A == Result B."""
    dir_a = tmp_path / "proj_iso_a"
    dir_b = tmp_path / "proj_iso_b"
    dir_a.mkdir(parents=True, exist_ok=True)
    dir_b.mkdir(parents=True, exist_ok=True)

    proj_a = await get_or_create_project(db_session, str(dir_a), "Project A Isolation")
    proj_b = await get_or_create_project(db_session, str(dir_b), "Project B Isolation")

    # Ingest activity only into Project A
    ev_payload = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.FILE_MODIFIED,
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=proj_a.root_path,
        file_path="src/sensitive/vault.py",
        file_name="vault.py",
        file_extension=".py",
        language="Python",
        metadata={},
    )
    await create_event(db_session, ev_payload)
    await db_session.commit()

    graph_a = await build_project_knowledge_graph(db_session, proj_a.id)
    graph_b = await build_project_knowledge_graph(db_session, proj_b.id)

    # Project A has vault file
    assert any(n.label == "vault.py" for n in graph_a.nodes)

    # Project B must NOT have vault file
    assert not any(n.label == "vault.py" for n in graph_b.nodes)

    # Reconstructibility test: Result 1 == Result 2
    clear_knowledge_graph_cache(proj_a.id)
    reconstructed_a = await get_or_create_knowledge_graph(db_session, proj_a.id)

    assert graph_a.total_nodes == reconstructed_a.total_nodes
    assert graph_a.total_edges == reconstructed_a.total_edges
    assert graph_a.node_count_by_type == reconstructed_a.node_count_by_type
    assert graph_a.edge_count_by_type == reconstructed_a.edge_count_by_type
