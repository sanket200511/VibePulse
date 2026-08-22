"""
Multi-Domain Canonical Retriever.

Composes existing intelligence subsystems without duplicating scoring,
incident correlation, prediction, or AST analysis.
"""

from __future__ import annotations

import uuid

from app.core.logging import get_logger
from app.features.events.models import DevelopmentEvent
from app.features.evidence.schemas import EntityExplainabilityResponse
from app.features.evidence.service import explain_entity
from app.features.investigation.models import IncidentReviewHistory, IncidentReviewState
from app.features.knowledge_graph.schemas import (
    FileIntelligenceView,
    ProjectKnowledgeGraph,
    SubsystemIntelligenceView,
)
from app.features.knowledge_graph.service import (
    get_file_intelligence,
    get_or_create_knowledge_graph,
    get_subsystem_intelligence,
)
from app.features.predictive_intelligence.schemas import PredictiveSummary
from app.features.predictive_intelligence.service import (
    get_or_create_predictive_intelligence,
)
from app.features.project_context.schemas import ProjectContextRead
from app.features.project_context.service import get_or_create_project_context
from app.features.project_health.schemas import (
    ProjectPriorityItem,
    UnifiedProjectHealth,
)
from app.features.project_health.service import (
    get_or_create_unified_project_health,
    get_project_priorities,
)
from app.features.projects.models import Project
from app.features.security_intelligence.schemas import SecurityIntelligenceRead
from app.features.security_intelligence.service import (
    compute_security_intelligence,
)
from app.features.sessions.models import Session
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class RetrievedDomainData:
    """Aggregated container of canonical intelligence retrieved for a query."""

    def __init__(
        self,
        project: Project,
        events: list[DevelopmentEvent],
        sessions: list[Session],
        review_states: dict[str, IncidentReviewState],
        review_histories: list[IncidentReviewHistory],
        health: UnifiedProjectHealth,
        priorities: list[ProjectPriorityItem],
        sec_intel: SecurityIntelligenceRead,
        pred_intel: PredictiveSummary,
        graph: ProjectKnowledgeGraph,
        proj_ctx: ProjectContextRead | None,
        file_intels: dict[str, FileIntelligenceView],
        subsys_intels: dict[str, SubsystemIntelligenceView],
        evidence_explanations: dict[str, EntityExplainabilityResponse],
    ) -> None:
        self.project = project
        self.events = events
        self.sessions = sessions
        self.review_states = review_states
        self.review_histories = review_histories
        self.health = health
        self.priorities = priorities
        self.sec_intel = sec_intel
        self.pred_intel = pred_intel
        self.graph = graph
        self.proj_ctx = proj_ctx
        self.file_intels = file_intels
        self.subsys_intels = subsys_intels
        self.evidence_explanations = evidence_explanations


async def retrieve_canonical_domain_data(
    db: AsyncSession,
    project_id: uuid.UUID,
    target_entities: list[str],
    intent: str,
) -> RetrievedDomainData:
    """
    Fetch all canonical intelligence required for answering a query.
    Composes existing services without duplication.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    norm_root = project.root_path.replace("\\", "/").rstrip("/").lower()

    # 1. Fetch raw events
    ev_stmt = (
        select(DevelopmentEvent)
        .where(
            or_(
                DevelopmentEvent.project_root == project.root_path,
                func.lower(func.replace(DevelopmentEvent.project_root, "\\", "/")) == norm_root,
                func.lower(DevelopmentEvent.project_root).like(f"{norm_root}%"),
            )
        )
        .order_by(DevelopmentEvent.timestamp.desc())
        .limit(100)
    )
    ev_res = await db.execute(ev_stmt)
    events = list(ev_res.scalars().all())

    # 2. Fetch sessions
    sess_stmt = (
        select(Session)
        .where(
            or_(
                Session.project_id == project_id,
                Session.project_root == project.root_path,
                func.lower(func.replace(Session.project_root, "\\", "/")) == norm_root,
            )
        )
        .order_by(Session.started_at.desc())
        .limit(10)
    )
    sess_res = await db.execute(sess_stmt)
    sessions = list(sess_res.scalars().all())

    # 3. Fetch review states & history
    inc_stmt = select(IncidentReviewState).where(IncidentReviewState.project_id == project_id)
    inc_res = await db.execute(inc_stmt)
    review_states = {r.incident_id: r for r in inc_res.scalars().all()}

    hist_stmt = (
        select(IncidentReviewHistory)
        .where(IncidentReviewHistory.project_id == project_id)
        .order_by(IncidentReviewHistory.created_at.desc())
        .limit(20)
    )
    hist_res = await db.execute(hist_stmt)
    review_histories = list(hist_res.scalars().all())

    # 4. Fetch derived intelligence layers
    health = await get_or_create_unified_project_health(db, project_id)
    priorities = await get_project_priorities(db, project_id)
    sec_intel = await compute_security_intelligence(db, project_id)
    pred_intel = await get_or_create_predictive_intelligence(db, project_id)
    graph = await get_or_create_knowledge_graph(db, project_id)
    proj_ctx = await get_or_create_project_context(db, project_id)

    # 5. Fetch specific file intelligence if targeted
    file_intels: dict[str, FileIntelligenceView] = {}
    for ent in target_entities:
        if "." in ent and ("/" in ent or ent.endswith(".py") or ent.endswith(".ts")):
            try:
                fi = await get_file_intelligence(db, project_id, ent)
                file_intels[ent] = fi
            except Exception as err:
                logger.debug("file_intel_skip", extra={"file": ent, "error": str(err)})

    # Also extract file intelligence for top active files in graph
    for node in graph.nodes:
        if node.node_type == "File" and len(file_intels) < 5:
            f_path = node.metadata.get("file_path", node.label)
            if f_path and f_path not in file_intels:
                try:
                    fi = await get_file_intelligence(db, project_id, str(f_path))
                    file_intels[str(f_path)] = fi
                except Exception as err:
                    logger.debug("file_node_intel_skip", extra={"error": str(err)})

    # 6. Fetch specific subsystem intelligence if targeted
    subsys_intels: dict[str, SubsystemIntelligenceView] = {}
    for sub in graph.subsystems:
        try:
            si = await get_subsystem_intelligence(db, project_id, sub)
            subsys_intels[sub] = si
        except Exception as err:
            logger.debug("subsys_intel_skip", extra={"subsystem": sub, "error": str(err)})

    # 7. Fetch Evidence Intelligence explanation for current posture
    evidence_explanations: dict[str, EntityExplainabilityResponse] = {}
    try:
        health_exp = await explain_entity(db, project_id, "health", "overall")
        evidence_explanations["health"] = health_exp
    except Exception as err:
        logger.debug("health_explain_skip", extra={"error": str(err)})

    try:
        sec_exp = await explain_entity(db, project_id, "security", "current")
        evidence_explanations["security"] = sec_exp
    except Exception as err:
        logger.debug("sec_explain_skip", extra={"error": str(err)})

    return RetrievedDomainData(
        project=project,
        events=events,
        sessions=sessions,
        review_states=review_states,
        review_histories=review_histories,
        health=health,
        priorities=priorities,
        sec_intel=sec_intel,
        pred_intel=pred_intel,
        graph=graph,
        proj_ctx=proj_ctx,
        file_intels=file_intels,
        subsys_intels=subsys_intels,
        evidence_explanations=evidence_explanations,
    )
