# CLAUDE.md – VibePulse

Instructions for AI coding assistants (Claude, Copilot, Cursor, etc.) working on this repository.

---

## Project Overview

VibePulse is a Developer Observability Platform for the AI Coding Era.
It observes software evolution during AI-assisted development and provides actionable intelligence.

**This is NOT a code generation tool. It is an observation and intelligence tool.**

---

## Monorepo Layout

```
apps/api/          FastAPI backend (Python 3.12)
apps/dashboard/    React + Vite dashboard (TypeScript)
apps/daemon/       Node.js file-system observer (TypeScript)
packages/ui/       Shared React component primitives
packages/config/   Shared env/config utilities (Node-compatible)
docs/adr/          Architecture Decision Records
docker/            Dockerfiles and infrastructure configs
```

---

## Key Architectural Rules

### Feature-First (ADR 0002)

- **Do NOT create** global `routers/`, `models/`, `schemas/`, `services/` directories in `apps/api/`.
- **Do** create feature modules under `apps/api/app/features/<feature-name>/`.
- Each feature owns: `router.py`, `schemas.py`, `service.py` (when needed), `models.py` (when needed).
- `app/core/` is for **horizontal cross-cutting concerns only**: config, database session, exceptions.
- Features must NOT import from sibling features. Shared logic goes in `app/core/domain/`.

### Dashboard Pages

- Pages live in `apps/dashboard/src/pages/<feature>/`.
- Reusable domain-agnostic components live in `apps/dashboard/src/components/`.
- `packages/ui` is for truly shared primitives only (Button, Badge, etc.). Do NOT put feature-specific components there.

### Event-Driven (ADR 0003)

- The Daemon publishes events; the API consumes them.
- Do not add synchronous HTTP calls from Daemon → API for event data.

---

## Coding Standards

### TypeScript (all TS/TSX files)

- Strict mode is enabled. No `any` unless absolutely necessary (add a comment explaining why).
- Use `type` imports: `import { type Foo } from "./foo"`.
- Named exports only (no default exports except for pages and the main App component).
- Prefer `const` functions over `function` declarations in React components.

### Python

- Python 3.12+ features are encouraged (e.g., `type X = Y`, `match` statements).
- All functions must have type annotations (ruff `ANN` rules enforced).
- Pydantic models for all API request/response schemas — never use raw `dict`.
- Async everywhere in FastAPI routes and services (`async def`, `await`).
- Use `uv` for all Python package operations (`uv add`, `uv sync`, `uv run`).

### General

- No console.log in committed code (use the logger utility in the daemon).
- No hardcoded credentials, ports, or URLs — always use environment variables.
- All environment variables must be documented in the relevant `.env.example`.

---

# Product Experience Principles

VibePulse is not an analytics dashboard.

It is a Developer Workspace.

When implementing UI:

- Prioritize clarity over density.
- Prioritize storytelling over statistics.
- Prefer calm interfaces over flashy interfaces.
- Every screen must have one primary purpose.
- Motion must communicate state, not decorate.
- AI enhances the product but never dominates it.
- Avoid generic SaaS dashboard layouts.
- Think like a product designer, not a frontend developer.

---

## Running the Project

````bash
# Install JS/TS dependencies
pnpm install

# Setup backend and DB
cd apps/api && uv sync && uv run alembic upgrade head
cd ../..

# Start all services via supervisor:
pnpm dev

# Or start independently in 3 terminals:
# Terminal 1 (Dashboard): pnpm --filter @vibepulse/dashboard dev # :5183
# Terminal 2 (API): cd apps/api && uv run uvicorn app.main:app --reload --port 5184
# Terminal 3 (Daemon): pnpm --filter @vibepulse/daemon dev # :5185
```

---

## Adding a New Feature

### API (Python)

````

apps/api/app/features/<name>/
**init**.py
router.py ← FastAPI APIRouter
schemas.py ← Pydantic request/response models
service.py ← Business logic (when needed)
models.py ← SQLAlchemy ORM models (when needed)

````

Register the router in `app/main.py`:

```python
from app.features.<name>.router import router as <name>_router
app.include_router(<name>_router, prefix="/api/v1")
````

### Dashboard (React)

```
apps/dashboard/src/pages/<name>/
  <Name>Page.tsx       ← Page component
  use<Name>Data.ts     ← TanStack Query hook (when needed)
```

Add the route in `src/App.tsx`.

---

## What NOT to Do

- Do NOT run `npm install` — use `pnpm` exclusively.
- Do NOT add packages without checking if a workspace package already provides the functionality.
- Do NOT use `pip install` — use `uv add` or `uv sync`.
- Do NOT create `packages/types`, `packages/sdk`, or other packages unless there is demonstrated cross-app need.
- Do NOT add business logic to `app/main.py` — it is configuration only.
- Do NOT create API endpoints that are not backed by a feature module.

---

## Useful Commands

```bash
pnpm dev                             # Start all apps
pnpm lint                            # Lint all TS/TSX
pnpm typecheck                       # TypeCheck all TS
pnpm format                          # Format everything
pnpm --filter @vibepulse/dashboard dev    # Dashboard only
pnpm --filter @vibepulse/daemon dev       # Daemon only
cd apps/api && uv run pytest         # API tests
cd apps/api && uv run ruff check app/ # API lint
```

---

## Architecture Decision Records

Before making significant architectural decisions, read:

- [ADR 0001 – Monorepo Strategy](./docs/adr/0001-monorepo-strategy.md)
- [ADR 0002 – Feature-First Architecture](./docs/adr/0002-feature-first-architecture.md)
- [ADR 0003 – Event-Driven Core](./docs/adr/0003-event-driven-core.md)

When making a new significant decision, create `docs/adr/NNNN-<slug>.md` before implementing.
