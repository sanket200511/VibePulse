# ⚡ VibePulse

> Developer Observability Platform for the AI Coding Era

VibePulse continuously observes software evolution during AI-assisted development and provides actionable intelligence — surfacing architecture drift, technical debt, and project health before they become problems.

---

## What VibePulse Does

| Capability | Description |
|---|---|
| **Event Collection** | Real-time ingestion of file changes, git operations, and AI tool interactions |
| **Session Replay** | Reconstruct coding sessions to understand how a codebase evolved |
| **AI Fingerprinting** | Identify AI-generated patterns and their downstream effects |
| **Architecture Drift** | Detect when the codebase deviates from intended structure |
| **Project Health** | Continuous health scoring across complexity, coverage, and consistency dimensions |
| **Recommendations** | Actionable, context-aware suggestions from the platform |

---

## Repository Structure

```
vibepulse/
├── apps/
│   ├── api/          # FastAPI backend (Python 3.12)
│   ├── dashboard/    # React + Vite dashboard
│   └── daemon/       # Node.js file-system observer
├── packages/
│   ├── ui/           # Shared React component primitives
│   └── config/       # Shared configuration utilities
├── docs/
│   ├── adr/          # Architecture Decision Records
│   ├── architecture/ # System design diagrams
│   └── research/     # Research notes
├── docker/           # Dockerfiles and infrastructure config
├── scripts/          # Developer tooling scripts
└── .github/          # CI/CD workflows
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Dashboard** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand |
| **API** | FastAPI, Python 3.12, SQLAlchemy 2.x, Pydantic v2, Alembic |
| **Daemon** | Node.js, TypeScript, Chokidar |
| **Database** | PostgreSQL 16 |
| **Cache / Events** | Redis 7 |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Containers** | Docker, Docker Compose |

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 20 | Dashboard + Daemon runtime |
| [pnpm](https://pnpm.io/) | ≥ 9 | Package manager |
| [Python](https://python.org/) | 3.12 | API runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Python package manager |
| [Docker](https://www.docker.com/) | latest | Infrastructure services |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/sanket200511/VibePulse.git
cd VibePulse
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/daemon/.env.example apps/daemon/.env
```

### 3. Install Python dependencies

```bash
cd apps/api
uv sync
cd ../..
```

### 4. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **pgAdmin** on `http://localhost:5050` (email: `admin@vibepulse.dev`, password: `admin`)
- **API** on `http://localhost:8000`

### 5. Start all apps

```bash
pnpm dev
```

This starts:
- ✅ **Dashboard** → `http://localhost:5173`
- ✅ **API** → `http://localhost:8000` (also available in Docker)
- ✅ **Daemon** → health on `http://localhost:9000/health`

---

## Services at a Glance

| Service | URL | Description |
|---|---|---|
| Dashboard | http://localhost:5173 | React web application |
| API | http://localhost:8000 | FastAPI backend |
| API Docs | http://localhost:8000/docs | Swagger UI (dev only) |
| Daemon Health | http://localhost:9000/health | Daemon liveness probe |
| pgAdmin | http://localhost:5050 | Database GUI |

---

## Development Commands

```bash
# Run all apps in development mode
pnpm dev

# Build all apps
pnpm build

# Lint all packages
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# TypeScript type-check all packages
pnpm typecheck

# Format all files
pnpm format

# Check formatting without writing
pnpm format:check
```

### Package-specific commands

```bash
# Run only the dashboard
pnpm --filter @vibepulse/dashboard dev

# Run only the daemon
pnpm --filter @vibepulse/daemon dev

# Run API tests
cd apps/api && uv run pytest

# Lint Python code
cd apps/api && uv run ruff check app/
```

---

## Architecture

VibePulse follows an **event-driven architecture**:

```
Developer Machine
      │
      ▼
  ┌─────────┐       Redis Streams       ┌─────────┐
  │  Daemon  │ ──── XADD events ──────► │   API   │
  │(observer)│                          │(FastAPI)│
  └─────────┘                          └────┬────┘
                                            │ WebSocket
                                       ┌────▼────┐
                                       │Dashboard│
                                       │ (React) │
                                       └─────────┘
```

See [`docs/adr/`](./docs/adr/) for Architecture Decision Records explaining key decisions.

---

## Project Standards

- **Commit style**: [Conventional Commits](https://www.conventionalcommits.org/)
- **Branch naming**: `feat/`, `fix/`, `chore/`, `docs/`
- **Pre-commit hooks**: husky + lint-staged (runs ESLint + Prettier on staged files)
- **Python code style**: ruff (formatting + linting)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes — the pre-commit hook will lint and format your code automatically
4. Push and open a Pull Request

---

## License

MIT © VibePulse Contributors
