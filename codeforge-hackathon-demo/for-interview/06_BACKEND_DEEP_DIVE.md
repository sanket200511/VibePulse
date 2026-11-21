# 🐍 06. Backend Architecture Deep Dive (FastAPI & Python 3.12)

This document explains the Python backend design, FastAPI dependency injection, SQLAlchemy 2.0 async sessions, Pyright static typing, and graph processing logic in `apps/api`.

---

## 🏗️ 1. Directory & Layering Structure

```
apps/api/app/
├── core/                    # Configuration, DB engine setup, CORS
│   ├── config.py            # Pydantic BaseSettings for PORT=5184, DB URL
│   └── database.py          # SQLAlchemy create_async_engine & get_async_db
├── features/
│   ├── knowledge_graph/     # Core Graph APIs
│   │   ├── router.py        # REST Endpoints (/knowledge-graph, /traversal)
│   │   ├── schemas.py       # Pydantic V2 models for Node, Edge, GraphResponse
│   │   ├── service.py       # DB Queries, BFS Traversal & Score Engine
│   │   └── repository.py    # Raw SQLAlchemy async queries
│   ├── investigation/       # Grounded Evidence & Incident Deep-Links
│   └── telemetry/           # Real-Time Event Ingestion
└── main.py                  # FastAPI Application Factory & Middleware
```

---

## ⚡ 2. Async SQLAlchemy 2.0 & DB Session Management

VibePulse uses non-blocking asynchronous PostgreSQL drivers (`asyncpg`) to support concurrent telemetry streaming and graph querying:

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 🕸️ 3. Root Cause Traversal Algorithm (`service.py`)

The backend performs Breadth-First Search (BFS) pathfinding from an Incident node back through findings to the root developer event:

```python
async def get_root_cause_traversal(db: AsyncSession, project_id: str, start_node_id: str):
    # Fetch all edges for the project
    edges = await repository.get_project_edges(db, project_id)
    nodes = await repository.get_project_nodes(db, project_id)

    # Reverse adjacency map for upstream causal tracing
    reverse_adj = defaultdict(list)
    for edge in edges:
        reverse_adj[edge.target_node_id].append(edge.source_node_id)

    path = []
    visited = set()
    queue = deque([start_node_id])

    while queue:
        curr_id = queue.popleft()
        if curr_id in visited:
            continue
        visited.add(curr_id)

        node = next((n for n in nodes if n.node_id == curr_id), None)
        if node:
            path.append({"step_index": len(path), "node_id": node.node_id, "label": node.label, "type": node.node_type})

        # Explore upstream sources
        for src_id in reverse_adj[curr_id]:
            if src_id not in visited:
                queue.append(src_id)

    return {"start_node_id": start_node_id, "steps": path}
```
