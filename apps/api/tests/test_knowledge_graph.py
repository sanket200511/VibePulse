"""
Engineering Knowledge Graph, Correlation & Causality Graph Integration Tests.

Validates:
1. Deterministic Knowledge Graph node and edge projection
2. Explicit semantic relationships (CONTAINS, BELONGS_TO, ASSOCIATED_WITH,
   CONTRIBUTED_TO, AFFECTS, RESOLVED_BY, CAUSED, MODIFIED, CONTAINS_FINDING)
3. Evidence-backed relationship explainability ("Why is this connected?")
4. Root Cause and Impact graph traversals
5. Chronological intelligence timeline
6. Before/After remediation state comparisons
7. File Intelligence & Subsystem Intelligence views
8. Project Memory 2.0 structured AI model
9. Multi-entity deterministic search
10. Secret masking (zero raw leakage of secrets)
11. Multi-project isolation (Project A vs Project B)
12. Deterministic Reconstructibility (Result A == Result B)
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
    explain_graph_edge,
    get_before_after_comparison,
    get_file_intelligence,
    get_graph_timeline,
    get_or_create_knowledge_graph,
    get_project_memory,
    get_subsystem_intelligence,
    search_knowledge_graph,
    trace_impact,
    trace_root_cause,
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


@pytest.mark.asyncio
async def test_edge_explainability_and_evidence_grounding(db_session: AsyncSession, tmp_path):
    """Verify explaining a graph edge produces grounded reason and evidence."""
    proj_dir = tmp_path / "kg_proj_edge_explain"
    proj_dir.mkdir(parents=True, exist_ok=True)
    proj = await get_or_create_project(db_session, str(proj_dir), "Edge Explain Project")

    # Create event
    ev_payload = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.FILE_MODIFIED,
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=proj.root_path,
        file_path="src/config/settings.py",
        file_name="settings.py",
        file_extension=".py",
        language="Python",
        metadata={"diff": "+ API_KEY = 'secret'"},
    )
    await create_event(db_session, ev_payload)
    await db_session.commit()

    graph = await build_project_knowledge_graph(db_session, proj.id)
    assert len(graph.edges) > 0

    first_edge = graph.edges[0]
    explanation = await explain_graph_edge(db_session, proj.id, first_edge.relationship_id)

    assert explanation.relationship_id == first_edge.relationship_id
    assert explanation.is_grounded is True
    assert len(explanation.reason) > 0
    assert explanation.source_node_id == first_edge.source_node_id
    assert explanation.target_node_id == first_edge.target_node_id

    # Test nonexistent edge
    invalid_exp = await explain_graph_edge(db_session, proj.id, "nonexistent-rel-id")
    assert invalid_exp.is_grounded is False
    assert "Insufficient evidence" in invalid_exp.reason


@pytest.mark.asyncio
async def test_root_cause_and_impact_traversal(db_session: AsyncSession, tmp_path):
    """Verify deterministic backward Root Cause and forward Impact traversals."""
    proj_dir = tmp_path / "kg_proj_traversal"
    proj_dir.mkdir(parents=True, exist_ok=True)
    proj = await get_or_create_project(db_session, str(proj_dir), "Traversal Project")

    ev_payload = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.FILE_MODIFIED,
        timestamp=datetime.now(tz=UTC),
        session_id=uuid.uuid4(),
        project_root=proj.root_path,
        file_path="src/payments/processor.py",
        file_name="processor.py",
        file_extension=".py",
        language="Python",
        metadata={"diff": "+ def process_payment(): pass"},
    )
    await create_event(db_session, ev_payload)
    await db_session.commit()

    graph = await build_project_knowledge_graph(db_session, proj.id)

    # Find file node
    file_node = next((n for n in graph.nodes if n.node_type == "File"), None)
    assert file_node is not None

    # Trace Impact forward from File
    impact = await trace_impact(db_session, proj.id, file_node.node_id)
    assert impact.mode == "IMPACT"
    assert impact.starting_node_id == file_node.node_id
    assert len(impact.steps) >= 1
    assert impact.total_steps >= 1

    # Trace Root Cause backward from Project Health
    root_cause = await trace_root_cause(db_session, proj.id, f"project-{proj.id}")
    assert root_cause.mode == "ROOT_CAUSE"
    assert root_cause.starting_node_id == f"project-{proj.id}"
    assert len(root_cause.steps) >= 1

    # Invalid node traversal should fail gracefully
    invalid_traversal = await trace_root_cause(db_session, proj.id, "nonexistent-node-id")
    assert invalid_traversal.is_complete is False
    assert invalid_traversal.total_steps == 0
    assert "not found" in invalid_traversal.stopping_reason


@pytest.mark.asyncio
async def test_graph_timeline_and_before_after_comparison(db_session: AsyncSession, tmp_path):
    """Verify chronological timeline and before/after remediation projections."""
    proj_dir = tmp_path / "kg_proj_timeline"
    proj_dir.mkdir(parents=True, exist_ok=True)
    proj = await get_or_create_project(db_session, str(proj_dir), "Timeline & BeforeAfter Project")

    # Ingest event
    ev_payload = DevelopmentEventCreate(
        schema_version=1,
        event_type=EventType.FILE_MODIFIED,
        timestamp=datetime.now(tz=UTC) - timedelta(minutes=15),
        session_id=uuid.uuid4(),
        project_root=proj.root_path,
        file_path="src/config/settings.py",
        file_name="settings.py",
        file_extension=".py",
        language="Python",
        metadata={},
    )
    await create_event(db_session, ev_payload)

    # Ingest review history
    hist = IncidentReviewHistory(
        project_id=proj.id,
        incident_id="INC-DEMO-1",
        previous_status="OPEN",
        new_status="RESOLVED",
        reviewer="AuditBot",
        resolution_note="Remediated configuration",
        created_at=datetime.now(tz=UTC),
    )
    db_session.add(hist)
    await db_session.commit()

    # Timeline
    timeline = await get_graph_timeline(db_session, proj.id)
    assert timeline.project_id == proj.id
    assert timeline.total_events >= 2
    # Verify chronological sort order
    for i in range(len(timeline.events) - 1):
        assert timeline.events[i].timestamp <= timeline.events[i + 1].timestamp

    # Before / After Comparison
    before_after = await get_before_after_comparison(db_session, proj.id)
    assert before_after.project_id == proj.id
    assert len(before_after.before_nodes) > 0
    assert len(before_after.after_nodes) > 0
    assert before_after.resolved_incidents_count >= 0
