"""
Engineering Knowledge Graph & Project Memory 2.0 Router.

REST:
  GET  /api/projects/{project_id}/knowledge-graph                  — full graph projection
  GET  /api/projects/{project_id}/knowledge-graph/nodes            — graph nodes
  GET  /api/projects/{project_id}/knowledge-graph/relationships    — graph relationships
  GET  /api/projects/{project_id}/knowledge-graph/files/{path}     — file intelligence
  GET  /api/projects/{project_id}/knowledge-graph/subsystems/{sub} — subsystem intelligence
  GET  /api/projects/{project_id}/knowledge-graph/incidents/{inc}  — incident relationships
  GET  /api/projects/{project_id}/knowledge-graph/memory           — Project Memory 2.0 AI model
  GET  /api/projects/{project_id}/knowledge-graph/search           — deterministic search
  POST /api/projects/{project_id}/knowledge-graph/refresh          — force re-projection
"""

from __future__ import annotations

import uuid

from app.core.database import get_db
from app.features.knowledge_graph import service
from app.features.knowledge_graph.schemas import (
    FileIntelligenceView,
    GraphSearchResult,
    IncidentRelationshipView,
    KnowledgeGraphEdge,
    KnowledgeGraphNode,
    ProjectKnowledgeGraph,
    ProjectMemory2,
    SubsystemIntelligenceView,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/projects/{project_id}/knowledge-graph", tags=["knowledge-graph"])


@router.get("", response_model=ProjectKnowledgeGraph, summary="Get project knowledge graph")
async def get_project_knowledge_graph(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectKnowledgeGraph:
    try:
        return await service.get_or_create_knowledge_graph(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/nodes", response_model=list[KnowledgeGraphNode], summary="Get graph nodes")
async def get_graph_nodes(
    project_id: uuid.UUID,
    node_type: str | None = Query(None, description="Optional filter by node_type"),
    subsystem: str | None = Query(None, description="Optional filter by subsystem"),
    db: AsyncSession = Depends(get_db),
) -> list[KnowledgeGraphNode]:
    try:
        graph = await service.get_or_create_knowledge_graph(db, project_id)
        nodes = graph.nodes
        if node_type:
            nodes = [n for n in nodes if n.node_type.lower() == node_type.lower()]
        if subsystem:
            nodes = [n for n in nodes if n.subsystem and n.subsystem.lower() == subsystem.lower()]
        return nodes
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/relationships",
    response_model=list[KnowledgeGraphEdge],
    summary="Get graph relationships",
)
async def get_graph_relationships(
    project_id: uuid.UUID,
    relationship_type: str | None = Query(None, description="Optional filter by relationship_type"),
    db: AsyncSession = Depends(get_db),
) -> list[KnowledgeGraphEdge]:
    try:
        graph = await service.get_or_create_knowledge_graph(db, project_id)
        edges = graph.edges
        if relationship_type:
            edges = [e for e in edges if e.relationship_type.lower() == relationship_type.lower()]
        return edges
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/files/{file_path:path}",
    response_model=FileIntelligenceView,
    summary="Get file intelligence",
)
async def get_file_intelligence(
    project_id: uuid.UUID,
    file_path: str,
    db: AsyncSession = Depends(get_db),
) -> FileIntelligenceView:
    try:
        return await service.get_file_intelligence(db, project_id, file_path)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/subsystems/{subsystem_name}",
    response_model=SubsystemIntelligenceView,
    summary="Get subsystem intelligence",
)
async def get_subsystem_intelligence(
    project_id: uuid.UUID,
    subsystem_name: str,
    db: AsyncSession = Depends(get_db),
) -> SubsystemIntelligenceView:
    try:
        return await service.get_subsystem_intelligence(db, project_id, subsystem_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/incidents/{incident_id}",
    response_model=IncidentRelationshipView,
    summary="Get incident relationships",
)
async def get_incident_relationships(
    project_id: uuid.UUID,
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> IncidentRelationshipView:
    try:
        return await service.get_incident_relationships(db, project_id, incident_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/memory",
    response_model=ProjectMemory2,
    summary="Get Project Memory 2.0 AI model",
)
async def get_project_memory(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectMemory2:
    try:
        return await service.get_project_memory(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/search",
    response_model=list[GraphSearchResult],
    summary="Deterministic multi-entity search",
)
async def search_knowledge_graph(
    project_id: uuid.UUID,
    q: str = Query(..., min_length=1, description="Search query string"),
    db: AsyncSession = Depends(get_db),
) -> list[GraphSearchResult]:
    try:
        return await service.search_knowledge_graph(db, project_id, q)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post(
    "/refresh",
    response_model=ProjectKnowledgeGraph,
    summary="Force refresh knowledge graph projection from PostgreSQL",
)
async def refresh_knowledge_graph(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectKnowledgeGraph:
    try:
        service.clear_knowledge_graph_cache(project_id)
        return await service.build_project_knowledge_graph(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
