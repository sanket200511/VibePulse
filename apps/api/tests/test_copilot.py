"""
Tests for AI Engineering Copilot Foundation (Sprint 11).

Tests:
1. Query Classification for all 12 canonical intents
2. Answerability Gate & Grounded Telemetry Verification
3. Provenance Partitioning ([OBSERVED], [INFERRED], [UNKNOWN])
4. Multi-Domain Canonical Retrieval & Synthesis
5. Secret Masking Safety (VIBEPULSE_SPRINT11_SECRET_2026 -> [REDACTED])
6. Multi-Project Isolation (Project A vs Project B)
7. Deterministic Reconstructibility (A == B)
8. State-driven dynamic suggestions
"""

import uuid
from datetime import UTC, datetime

import pytest
from app.features.analysis.models import EventAnalysis
from app.features.copilot.query_classifier import classify_query
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
    """Verify deterministic intent classification across all 12 domains."""
    cases = [
        ("Why is this project unhealthy?", "PROJECT_HEALTH"),
        ("What should I fix first?", "PROJECT_HEALTH"),
        ("Why did SEC001 appear in settings.py?", "SECURITY"),
        ("What security issues keep recurring?", "SECURITY"),
        ("What happened to auth.py?", "FILE"),
        ("Tell me about src/config/settings.py", "FILE"),
        ("Which subsystem is under the most pressure?", "SUBSYSTEM"),
        ("Why was this incident created?", "INCIDENT"),
        ("What might go wrong next?", "PREDICTION"),
        ("What was resolved recently?", "RESOLUTION"),
        ("What is connected to auth.py?", "KNOWLEDGE_GRAPH"),
        ("Why does VibePulse believe this score?", "EVIDENCE"),
        ("What does VibePulse know about this project?", "PROJECT_OVERVIEW"),
        ("What changed recently?", "ENGINEERING_ACTIVITY"),
        ("Who is the prime minister of Canada?", "UNKNOWN"),
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
            "diff": "secret = 'VIBEPULSE_SPRINT11_SECRET_2026'",
            "risk_score": 75,
            "security_findings": [
                {
                    "rule_id": "SEC001",
                    "severity": "CRITICAL",
                    "message": "Hardcoded secret: VIBEPULSE_SPRINT11_SECRET_2026",
                    "risk_contribution": 50,
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
                    "description": "Hardcoded secret: VIBEPULSE_SPRINT11_SECRET_2026",
                    "evidence": "secret = 'VIBEPULSE_SPRINT11_SECRET_2026'",
                    "risk_contribution": 50,
                    "file": "src/auth/jwt.py",
                }
            ],
        },
        duration_ms=1.5,
    )
    db_session.add(analysis1)
    await db_session.commit()

    # Query 1: "What should I fix first?" (PROJECT_HEALTH)
    resp = await query_copilot(db_session, proj_id, "What should I fix first?")
    assert resp.answerable is True
    assert resp.intent == "PROJECT_HEALTH"
    assert "Priority #" in resp.summary or "Health Score" in resp.summary
    assert len(resp.observed) > 0
    assert len(resp.inferred) > 0
    assert len(resp.recommendations) > 0
    assert "VIBEPULSE_SPRINT11_SECRET_2026" not in str(resp.model_dump())

    # Query 2: "What security issues are in this project?" (SECURITY)
    resp_sec = await query_copilot(db_session, proj_id, "What security issues are in this project?")
    assert resp_sec.intent == "SECURITY"
    assert "SEC001" in resp_sec.summary
    assert "VIBEPULSE_SPRINT11_SECRET_2026" not in str(resp_sec.model_dump())
    assert "[REDACTED]" in str(resp_sec.model_dump())

    # Query 3: Out of scope / Unknown query
    resp_unknown = await query_copilot(db_session, proj_id, "How do I make coffee in the kitchen?")
    assert resp_unknown.answerable is False
    assert resp_unknown.intent == "UNKNOWN"
    assert "cannot definitively answer" in resp_unknown.summary


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

    # Telemetry only in Project A
    now = datetime.now(tz=UTC)
    ev_a = DevelopmentEvent(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        project_root="/repos/alpha",
        event_type="FILE_MODIFIED",
        file_path="src/payments/stripe.py",
        file_name="stripe.py",
        file_extension=".py",
        language="Python",
        timestamp=now,
        event_metadata={
            "diff": "API_KEY = 'sk_live_9999'",
            "risk_score": 60,
            "security_findings": [
                {
                    "rule_id": "SEC001",
                    "severity": "CRITICAL",
                    "message": "Sensitive key exposed",
                    "risk_contribution": 40,
                }
            ],
        },
    )
    db_session.add(ev_a)
    await db_session.flush()

    analysis_a = EventAnalysis(
        id=uuid.uuid4(),
        event_id=ev_a.id,
        analyzer_name="security_guardian",
        analyzer_version=1,
        findings={
            "risk_score": 60,
            "findings": [
                {
                    "rule_id": "SEC001",
                    "severity": "CRITICAL",
                    "message": "Sensitive key exposed",
                    "risk_contribution": 40,
                    "file": "src/payments/stripe.py",
                }
            ],
        },
        duration_ms=2.0,
    )
    db_session.add(analysis_a)
    await db_session.commit()

    # Dynamic suggestions for Project A
    sug_a = await get_copilot_suggestions(db_session, proj_a.id)
    assert len(sug_a) >= 2
    assert any("fix first" in s.question.lower() for s in sug_a)

    # Full context for Project A
    ctx_a = await get_copilot_context(db_session, proj_a.id)
    assert ctx_a.project_display_name == "Project Alpha"
    assert len(ctx_a.observed_facts) > 0

    # Multi-project isolation: Project B must NOT contain Project A files or findings
    ctx_b = await get_copilot_context(db_session, proj_b.id)
    assert ctx_b.project_display_name == "Project Beta"
    assert not any("stripe.py" in f.statement for f in ctx_b.observed_facts)
    assert len(ctx_b.relevant_findings) == 0

    # Reconstructibility: Result A == Result B
    q1 = await query_copilot(db_session, proj_a.id, "What should I fix first?")
    q2 = await query_copilot(db_session, proj_a.id, "What should I fix first?")
    assert q1.summary == q2.summary
    assert q1.intent == q2.intent
    assert len(q1.observed) == len(q2.observed)
