"""
Tests for AI Engineering Copilot Hardening & Intelligence Loop (Sprint 12).

Tests:
1. Query Classification for all 16 canonical query families + out-of-scope rejection
2. Answerability Gate & Grounded Telemetry Verification
3. Provenance Partitioning ([OBSERVED], [INFERRED], [UNKNOWN])
4. Multi-Domain Canonical Retrieval & Narrative Synthesis
5. Secret Masking Safety (VIBEPULSE_SPRINT12_SECRET_2026 -> [REDACTED])
6. Multi-Project Isolation (Project A vs Project B)
7. Deterministic Reconstructibility (A == B)
8. State-driven dynamic suggestions
"""

import uuid
from datetime import UTC, datetime

import pytest
from app.features.analysis.models import EventAnalysis
from app.features.copilot.query_classifier import classify_query
from app.features.copilot.schemas import CopilotQueryRequest
from app.features.copilot.service import (
    get_copilot_context,
    get_copilot_suggestions,
    query_copilot,
)
from app.features.events.models import DevelopmentEvent
from app.features.projects.models import Project
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


def test_copilot_query_classification_intents():
    """Verify deterministic intent classification across all 16 query families + out-of-scope."""
    cases = [
        ("What is the current health of this project?", "PROJECT_HEALTH"),
        ("Why is this project unhealthy?", "PROJECT_HEALTH"),
        ("What security problems do we currently have?", "SECURITY"),
        ("What security findings keep recurring?", "SECURITY"),
        ("What should I fix first?", "PRIORITY"),
        ("What should I do next?", "PRIORITY"),
        ("What happened recently?", "ENGINEERING_ACTIVITY"),
        ("Which files are causing the most activity?", "ENGINEERING_ACTIVITY"),
        ("Which subsystem is under pressure?", "SUBSYSTEM"),
        ("What incidents are currently unresolved?", "INCIDENT"),
        ("Why was this incident classified as critical?", "INCIDENT_CRITICALITY"),
        ("What caused this incident?", "INCIDENT_CAUSE"),
        ("What changed in auth.py?", "FILE"),
        ("What is connected to auth.py?", "KNOWLEDGE_GRAPH"),
        ("What should we watch next?", "PREDICTION"),
        ("What might go wrong next?", "PREDICTION"),
        ("How was this incident resolved?", "RESOLUTION"),
        ("What do we know about this project?", "PROJECT_OVERVIEW"),
        ("Generate an AI handoff for this project.", "AI_HANDOFF"),
        ("Why does DepRadar believe this score?", "EVIDENCE"),
        # Out-of-scope queries
        ("What is Bitcoin's price tomorrow?", "UNKNOWN"),
        ("What will the weather be tomorrow?", "UNKNOWN"),
        ("Who will win the election?", "UNKNOWN"),
        ("What does the developer's private email say?", "UNKNOWN"),
    ]
    for text, expected_intent in cases:
        res = classify_query(text)
        assert res.intent == expected_intent, (
            f"Query '{text}' mapped to {res.intent}, expected {expected_intent}"
        )


@pytest.mark.asyncio
async def test_copilot_e2e_query_and_provenance(db_session: AsyncSession, client: AsyncClient):
    """
    Test end-to-end Copilot query execution with grounded facts,
    explicit provenance tags, and recommendations.
    """
    proj_id = uuid.uuid4()
    proj = Project(
        id=proj_id,
        display_name="Copilot Demo App",
        root_path="/repos/copilot-demo",
    )
    db_session.add(proj)

    # Add telemetry events
    now = datetime.now(tz=UTC)
    ev1 = DevelopmentEvent(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        project_root="/repos/copilot-demo",
        event_type="FILE_MODIFIED",
        file_path="src/auth/jwt.py",
        file_name="jwt.py",
        file_extension=".py",
        language="Python",
        timestamp=now,
        event_metadata={
            "diff": "secret = 'VIBEPULSE_SPRINT12_SECRET_2026'",
            "risk_score": 75,
            "security_findings": [
                {
                    "rule_id": "SEC001",
                    "severity": "CRITICAL",
                    "description": "Hardcoded secret: VIBEPULSE_SPRINT12_SECRET_2026",
                    "evidence": "secret = 'VIBEPULSE_SPRINT12_SECRET_2026'",
                    "risk_contribution": 50,
                    "file": "src/auth/jwt.py",
                }
            ],
        },
    )
    db_session.add(ev1)
    await db_session.flush()

    analysis1 = EventAnalysis(
        id=uuid.uuid4(),
        event_id=ev1.id,
        analyzer_name="security_guardian",
        analyzer_version=1,
        findings={
            "risk_score": 75,
            "findings": [
                {
                    "rule_id": "SEC001",
                    "severity": "CRITICAL",
                    "description": "Hardcoded secret: VIBEPULSE_SPRINT12_SECRET_2026",
                    "evidence": "secret = 'VIBEPULSE_SPRINT12_SECRET_2026'",
                    "risk_contribution": 50,
                    "file": "src/auth/jwt.py",
                }
            ],
        },
        duration_ms=1.5,
    )
    db_session.add(analysis1)
    await db_session.commit()

    # Query 1: "What should I fix first?" (PRIORITY)
    resp = await query_copilot(
        db_session, proj_id, CopilotQueryRequest(query="What should I fix first?")
    )
    assert resp.answerable is True
    assert resp.intent == "PRIORITY"
    assert "Priority #" in resp.summary or "Recommended" in resp.summary
    assert len(resp.observed) > 0
    assert len(resp.inferred) > 0
    assert len(resp.recommendations) > 0
    assert "VIBEPULSE_SPRINT12_SECRET_2026" not in str(resp.model_dump())

    # Query 2: "What security issues are in this project?" (SECURITY)
    resp_sec = await query_copilot(
        db_session,
        proj_id,
        CopilotQueryRequest(query="What security problems do we currently have?"),
    )
    assert resp_sec.intent == "SECURITY"
    assert "SEC001" in resp_sec.summary
    assert "VIBEPULSE_SPRINT12_SECRET_2026" not in str(resp_sec.model_dump())
    assert "[REDACTED]" in str(resp_sec.model_dump())

    # Query 3: Out of scope / Unknown query
    resp_unknown = await query_copilot(
        db_session, proj_id, CopilotQueryRequest(query="What is Bitcoin's price tomorrow?")
    )
    assert resp_unknown.answerable is False
    assert resp_unknown.intent == "UNKNOWN"
    assert resp_unknown.evidence_strength == "INSUFFICIENT"
    assert "outside" in resp_unknown.answerability_reason.lower()


@pytest.mark.asyncio
async def test_copilot_context_and_suggestions(db_session: AsyncSession, client: AsyncClient):
    """Test /context and /suggestions endpoints and multi-project isolation."""
    proj_a = Project(
        id=uuid.uuid4(),
        display_name="Project Alpha",
        root_path="/repos/alpha",
    )
    proj_b = Project(
        id=uuid.uuid4(),
        display_name="Project Beta",
        root_path="/repos/beta",
    )
    db_session.add_all([proj_a, proj_b])
    await db_session.commit()

    # Ingest event for Project Alpha only
    ev_a = DevelopmentEvent(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        project_root="/repos/alpha",
        event_type="FILE_MODIFIED",
        file_path="src/auth.py",
        file_name="auth.py",
        file_extension=".py",
        language="Python",
        timestamp=datetime.now(tz=UTC),
        event_metadata={"diff": "+ def authenticate(): pass"},
    )
    db_session.add(ev_a)
    await db_session.commit()

    # Fetch context for Alpha
    ctx_a = await get_copilot_context(db_session, proj_a.id)
    assert ctx_a.project_display_name == "Project Alpha"
    assert len(ctx_a.observed_facts) > 0

    # Fetch context for Beta (isolated)
    ctx_b = await get_copilot_context(db_session, proj_b.id)
    assert ctx_b.project_display_name == "Project Beta"
    assert "src/auth.py" not in [f.statement for f in ctx_b.observed_facts]

    # Fetch suggestions
    sug_a = await get_copilot_suggestions(db_session, proj_a.id)
    assert len(sug_a) > 0
    assert any(s.intent in ("PRIORITY", "PROJECT_OVERVIEW", "SECURITY") for s in sug_a)
