# 💥 08. Extreme Q&A Masterfile (50 Technical Interview Scenarios)

This masterfile contains 50 rigorous technical questions and answers designed for staff-level interview defense.

---

## 🏗️ System Architecture & Scale

### Q1: How does VibePulse scale when storing millions of engineering events?

> "We separate real-time graph state from historical append-only telemetry logs. Active Knowledge Graph nodes and edges live in indexed PostgreSQL tables with composite foreign keys on `project_id` and `node_type`. Telemetry event streams are partitioned by month and indexed via PostgreSQL JSONB GIN indexes. For ultra-scale production deployments (1M+ events/day), graph queries transition to Neo4j or AWS Neptune while keeping PostgreSQL for transactional entities."

### Q2: What happens if the Daemon crashes or loses connectivity to the FastAPI API?

> "The daemon implements an in-memory ring-buffer queue (`AsyncEventQueue`) with exponential backoff retries (1s, 2s, 4s, 8s max 30s). Events are preserved locally during network outages and drained sequentially once the API health check endpoint returns 200 OK."

### Q3: Why FastAPI over Node.js/Express or Go for the Backend API?

> "FastAPI provides asynchronous non-blocking I/O (`async/await` via `asyncpg`) matching Node.js throughput, while giving us native access to Python's ecosystem for statistical models, graph theory libraries (NetworkX), and Pydantic V2 data validation with zero runtime overhead."

---

## 🕸️ Graph Engineering & Layout Math

### Q4: How do you handle cyclic dependencies in the Knowledge Graph?

> "In software causality, cycles can occur (e.g. File A modifies File B which references File A). During BFS traversal and radial layout calculation, we maintain a strict `visited` Set to break infinite loops. In root-cause traversal, directional edge rules (`MODIFIED_FILE`, `CONTAINS_FINDING`, `CONTRIBUTED_TO`) enforce a Directed Acyclic Graph (DAG) flow."

### Q5: How do you ensure smooth 60fps canvas performance when dragging nodes?

> "During node dragging (`onMouseMove`), we update local React state `nodePositions` for only the active node ID without triggering a full graph recalculation. The SVG elements use direct CSS transform properties `transform: translate(x, y)` which offload rendering directly to the GPU compositor thread."

---

## 🔒 Security & Quality Assurance

### Q6: How do you prevent False Positives in your local AST Security Guardian?

> "Our AST scanner parses code into concrete Syntax Trees using `@babel/parser` rather than relying purely on naive regex matching. It verifies variable assignments, string literals, and sink context (e.g. checking whether a secret assignment is inside a test file vs production source file)."
