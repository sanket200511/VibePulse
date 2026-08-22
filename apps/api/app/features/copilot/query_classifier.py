"""
Deterministic Query Classifier (Sprint 12 Hardened).

Classifies natural engineering query families into canonical CopilotIntents
and extracts target entity tokens (file paths, rule IDs, incident IDs, subsystems).
Strictly identifies out-of-scope questions without hallucination.
"""

from __future__ import annotations

import re
from typing import NamedTuple

from app.features.copilot.schemas import CopilotIntent


class ClassificationResult(NamedTuple):
    intent: CopilotIntent
    target_entities: list[str]
    confidence_score: float
    rationale: str


def classify_query(query: str) -> ClassificationResult:
    """
    Deterministically classify an engineering query into a canonical CopilotIntent.
    Extracts relevant entity tokens without hallucination.
    """
    q_raw = query.strip()
    q_low = q_raw.lower()

    entities: list[str] = []

    # 1. Extract file paths / names (e.g. auth.py, settings.py, src/database/models.py)
    file_matches = re.findall(
        r"[\w\-\./\\]+\.(?:py|ts|tsx|js|jsx|json|md|sql|ya?ml|toml|env)",
        q_raw,
        re.IGNORECASE,
    )
    for fm in file_matches:
        cleaned_fm = fm.strip("`'\"(),:;?").replace("\\", "/")
        if cleaned_fm and cleaned_fm not in entities:
            entities.append(cleaned_fm)

    # 2. Extract rule IDs (e.g. SEC001, DEBUG_TRUE, HARDCODED_SECRET, AST_...)
    rule_matches = re.findall(
        r"\b(?:SEC\d+|DEBUG_TRUE|HARDCODED_SECRET|AST_\w+|SQL_INJECTION)\b",
        q_raw,
        re.IGNORECASE,
    )
    for rm in rule_matches:
        u_rm = rm.upper()
        if u_rm not in entities:
            entities.append(u_rm)

    # 3. Extract incident IDs (e.g. INC-123, incident-abc, or 12-char hex IDs)
    inc_matches = re.findall(
        r"\b(?:INC-[A-Za-z0-9\-]+|incident-[A-Za-z0-9\-]+)\b", q_raw, re.IGNORECASE
    )
    for im in inc_matches:
        if im not in entities:
            entities.append(im)

    # 4. Extract subsystem names
    subsystem_keywords = {
        "authentication": "Authentication",
        "auth": "Authentication",
        "configuration": "Configuration",
        "config": "Configuration",
        "database": "Database",
        "db": "Database",
        "api": "API Routes",
        "router": "API Routes",
        "routes": "API Routes",
        "payment": "Payments",
        "analytics": "Analytics",
    }
    for kw, canon in subsystem_keywords.items():
        if re.search(r"\b" + re.escape(kw) + r"\b", q_low):
            if canon not in entities:
                entities.append(canon)

    # ── 0. OUT-OF-SCOPE / UNSUPPORTED QUERY DETECTION ─────────────────────────
    out_of_scope_patterns = (
        r"\b(?:bitcoin|btc|crypto|ethereum|stock|price|market\s+cap)\b",
        r"\b(?:weather|temperature|forecast\s+tomorrow|rain|sunny)\b",
        r"\b(?:election|president|prime\s+minister|vote|politics|democrat|republican)\b",
        r"\b(?:private\s+email|personal\s+chat|gmail|inbox|ceo\s+of|sports|football|basketball)\b",
    )
    for pat in out_of_scope_patterns:
        if re.search(pat, q_low):
            return ClassificationResult(
                intent="UNKNOWN",
                target_entities=entities,
                confidence_score=0.0,
                rationale="Query is outside observed engineering telemetry domain.",
            )

    # ── 1. CANONICAL INTENT CLASSIFICATION RULES ──────────────────────────────

    # A. Evidence / Explanation ("Why does VibePulse believe this?")
    if any(
        k in q_low
        for k in (
            "why does vibepulse believe",
            "why do you believe",
            "show me the evidence",
            "show evidence",
            "evidence behind",
            "why this score",
            "causal chain",
            "explain this score",
            "score decomposition",
        )
    ):
        return ClassificationResult(
            intent="EVIDENCE",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for causal evidence or score decomposition explanation.",
        )

    # B. AI Handoff Generation ("Generate an AI handoff for this project")
    if any(
        k in q_low
        for k in (
            "generate an ai handoff",
            "ai handoff",
            "handoff context",
            "export context",
            "generate project context",
            "handoff guidance",
        )
    ):
        return ClassificationResult(
            intent="AI_HANDOFF",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query requests full AI handoff artifact and project memory package.",
        )

    # C. Incident Criticality & Root Causes ("Why was this incident classified as critical?")
    if any(
        k in q_low
        for k in (
            "classified as critical",
            "why is this incident critical",
            "why critical",
            "criticality",
            "severity of incident",
        )
    ):
        return ClassificationResult(
            intent="INCIDENT_CRITICALITY",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks about incident severity classification and risk calculation.",
        )

    if any(
        k in q_low
        for k in (
            "what caused this incident",
            "root cause of incident",
            "what caused incident",
            "why was this incident created",
            "incident created",
            "cause of incident",
        )
    ):
        return ClassificationResult(
            intent="INCIDENT_CAUSE",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for root cause telemetry that triggered incident.",
        )

    # D. Knowledge Graph / Relationships ("What is connected to auth.py?")
    if any(
        k in q_low
        for k in (
            "connected to",
            "what is connected",
            "graph relationships",
            "knowledge graph",
            "related to",
            "how are its parts connected",
            "dependencies of",
            "what depends on",
        )
    ):
        return ClassificationResult(
            intent="KNOWLEDGE_GRAPH",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for relational connections and graph traversal.",
        )

    # E. Predictions / Forecasts ("What should we watch next?", "What might go wrong next?")
    if any(
        k in q_low
        for k in (
            "what should we watch next",
            "watch next",
            "what might go wrong",
            "what could become a problem",
            "likely to become a problem",
            "what will happen next",
            "forecast",
            "prediction",
            "predict",
            "hotspot",
            "future risk",
            "risk next",
        )
    ):
        return ClassificationResult(
            intent="PREDICTION",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for predictive engineering forecasts and future risk.",
        )

    # F. Priorities / Next Action ("What should I fix first?")
    if any(
        k in q_low
        for k in (
            "what should i fix first",
            "fix first",
            "what to fix first",
            "what should i do next",
            "what to do next",
            "top priority",
            "priorities",
            "highest priority",
            "next action",
        )
    ):
        return ClassificationResult(
            intent="PRIORITY",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for prioritized remediation guidance.",
        )

    # G. Resolution & Audit History ("How was this incident resolved?")
    if any(
        k in q_low
        for k in (
            "how was this incident resolved",
            "how was incident resolved",
            "what was resolved",
            "resolved recently",
            "recent resolutions",
            "triage history",
            "audit history",
            "who resolved",
            "resolution note",
        )
    ):
        return ClassificationResult(
            intent="RESOLUTION",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks about incident resolution and triage history.",
        )

    # H. Active / Unresolved Incidents ("What incidents are currently unresolved?")
    if (
        any(
            k in q_low
            for k in (
                "unresolved incidents",
                "open incidents",
                "active incidents",
                "incidents are currently unresolved",
                "what incidents",
                "tell me about incident",
                "incident details",
            )
        )
        or len(inc_matches) > 0
    ):
        return ClassificationResult(
            intent="INCIDENT",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query focuses on active security incidents and correlation.",
        )

    # I. Specific File Query ("What happened to auth.py?", "What changed in auth.py?")
    if len(file_matches) > 0 and any(
        k in q_low
        for k in (
            "what changed in",
            "what happened to",
            "tell me about",
            "status of",
            "changes in",
            "history of",
            "who touched",
            "file",
        )
    ):
        return ClassificationResult(
            intent="FILE",
            target_entities=entities,
            confidence_score=1.0,
            rationale=f"Query directly targets file entity {file_matches[0]}.",
        )

    # J. Security Problems & Recurring Rules ("What security problems do we currently have?")
    if len(rule_matches) > 0 or any(
        k in q_low
        for k in (
            "security problems",
            "security issues",
            "security findings",
            "keep recurring",
            "recurring security",
            "recurring findings",
            "vulnerability",
            "secret",
            "credential",
            "ast rule",
            "sec001",
            "unmitigated",
            "attack surface",
            "security posture",
        )
    ):
        return ClassificationResult(
            intent="SECURITY",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query investigates security posture, findings, or recurring rules.",
        )

    # K. Subsystem Pressure / Health ("Which subsystem is under pressure?")
    if any(
        k in q_low
        for k in (
            "which subsystem",
            "subsystem pressure",
            "subsystem is under",
            "subsystem health",
            "subsystems",
        )
    ) or (len(entities) > 0 and entities[0] in subsystem_keywords.values()):
        return ClassificationResult(
            intent="SUBSYSTEM",
            target_entities=entities,
            confidence_score=0.95,
            rationale="Query asks about subsystem health and activity pressure.",
        )

    # L. Activity / Most active files ("What happened recently?")
    if any(
        k in q_low
        for k in (
            "what happened recently",
            "what changed recently",
            "recent changes",
            "recent activity",
            "most activity",
            "causing the most activity",
            "most active files",
            "development activity",
            "sessions",
            "coding velocity",
        )
    ):
        return ClassificationResult(
            intent="ENGINEERING_ACTIVITY",
            target_entities=entities,
            confidence_score=0.95,
            rationale="Query asks for chronological engineering telemetry and sessions.",
        )

    # M. Project Health ("What is the current health of this project?")
    if any(
        k in q_low
        for k in (
            "current health",
            "health of this project",
            "how healthy",
            "unhealthy",
            "healthy",
            "health score",
            "at risk",
            "project risk",
            "health status",
            "project posture",
            "overall health",
            "health grade",
        )
    ):
        return ClassificationResult(
            intent="PROJECT_HEALTH",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks about project health score and risk posture.",
        )

    # N. Project Overview ("What do we know about this project?")
    if any(
        k in q_low
        for k in (
            "what do we know about this project",
            "what does vibepulse know",
            "what do you know",
            "what does vibepulse not know",
            "project overview",
            "project summary",
            "tell me about this project",
            "project memory",
            "technologies used",
        )
    ):
        return ClassificationResult(
            intent="PROJECT_OVERVIEW",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for macro project summary and memory.",
        )

    # Fallback to FILE if a file entity was mentioned
    if len(file_matches) > 0:
        return ClassificationResult(
            intent="FILE",
            target_entities=entities,
            confidence_score=0.9,
            rationale=f"Query references file {file_matches[0]}.",
        )

    # Unanswerable / Unknown intent
    return ClassificationResult(
        intent="UNKNOWN",
        target_entities=entities,
        confidence_score=0.0,
        rationale="Query is outside observed telemetry domain or underspecified.",
    )
