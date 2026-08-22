"""
Deterministic Query Classifier.

Classifies natural engineering queries into 12 canonical intents and extracts
target entity tokens (file paths, rule IDs, incident IDs, subsystem names).
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

    # ── DETERMINISTIC INTENT MATCHING RULES ───────────────────────────────────

    # Rule A: Evidence / Explanation ("Why does VibePulse believe this?")
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

    # Rule B: Knowledge Graph / Relationships ("What is connected to auth.py?")
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

    # Rule C: Predictions / Forecasts ("What might go wrong next?")
    if any(
        k in q_low
        for k in (
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

    # Rule D: Priorities / Fix first ("What should I fix first?")
    if any(
        k in q_low
        for k in (
            "what should i fix first",
            "fix first",
            "what to fix first",
            "what should i do next",
            "top priority",
            "priorities",
            "highest priority",
            "next action",
        )
    ):
        return ClassificationResult(
            intent="PROJECT_HEALTH",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query asks for prioritized remediation guidance.",
        )

    # Rule E: Specific File Query ("What happened to auth.py?")
    if len(file_matches) > 0 and any(
        k in q_low
        for k in (
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

    # Rule F: Specific Incident Query ("Why was this incident created?")
    if len(inc_matches) > 0 or any(
        k in q_low
        for k in (
            "why was this incident created",
            "incident created",
            "tell me about incident",
            "incident details",
            "correlated incident",
            "root cause of incident",
        )
    ):
        return ClassificationResult(
            intent="INCIDENT",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query focuses on incident correlation and investigation narrative.",
        )

    # Rule G: Security Query ("What security issues keep recurring?")
    if len(rule_matches) > 0 or any(
        k in q_low
        for k in (
            "security",
            "secret",
            "credential",
            "vulnerability",
            "ast rule",
            "sec001",
            "recurring security",
            "security issues",
            "unmitigated",
            "attack surface",
        )
    ):
        return ClassificationResult(
            intent="SECURITY",
            target_entities=entities,
            confidence_score=1.0,
            rationale="Query investigates security posture, findings, or recurring rules.",
        )

    # Rule H: Subsystem Pressure / Health ("Which subsystem is under pressure?")
    if any(
        k in q_low
        for k in (
            "which subsystem",
            "subsystem pressure",
            "subsystems",
            "subsystem is under",
            "subsystem health",
        )
    ) or (len(entities) > 0 and entities[0] in subsystem_keywords.values()):
        return ClassificationResult(
            intent="SUBSYSTEM",
            target_entities=entities,
            confidence_score=0.95,
            rationale="Query asks about subsystem health and activity pressure.",
        )

    # Rule I: Resolution / Triage History ("What was resolved recently?")
    if any(
        k in q_low
        for k in (
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

    # Rule J: Engineering Activity ("What changed recently?")
    if any(
        k in q_low
        for k in (
            "what changed recently",
            "recent changes",
            "what happened recently",
            "recent activity",
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

    # Rule K: Project Health / Risk ("Why is this project unhealthy?")
    if any(
        k in q_low
        for k in (
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

    # Rule L: Project Overview ("What does VibePulse know about this project?")
    if any(
        k in q_low
        for k in (
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
