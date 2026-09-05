# Contributing to DepRadar

First, thank you for your interest in contributing to DepRadar! This project is maintained by a core team but relies on open-source contributions to expand its analytical capabilities.

Before contributing, please read our [Architecture Reference](ARCHITECTURE.md) to understand the system's design philosophy.

---

## 1. Development Workflow

DepRadar is a Turborepo monorepo. We use `pnpm` for package management and `uv` for Python environments.

### Local Setup

1. Fork the repository and clone your fork.
2. Run `pnpm install` in the root directory.
3. Ensure local PostgreSQL is running on port 5432 and REDIS_URL is configured in `apps/api/.env`.
4. Run `uv sync` in `apps/api` and run `uv run alembic upgrade head` to migrate the DB.
5. Start the development servers in three terminals:
   - Terminal 1: `pnpm --filter @depradar/dashboard dev`
   - Terminal 2: `cd apps/api && uv run uvicorn app.main:app --reload --port 8080`
   - Terminal 3: `pnpm --filter @depradar/daemon dev`

### Running Tests

Before submitting a Pull Request, ensure all quality gates pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
cd apps/api && uv run ruff check app/ && uv run pyright app/ && uv run pytest tests/
```

---

## 2. Monorepo Rules

- **Feature-First**: New backend features belong in `apps/api/app/features/<feature_name>`. Do not put business logic in `app/core/`.
- **UI Primitives**: Reusable UI components (like Buttons or Badges) go into `packages/ui`. Feature-specific UI components belong in `apps/dashboard/src/pages/`.
- **Strict Typing**: Python code must pass `pyright` in strict mode. TypeScript code must pass `tsc` with `strict: true`. Use Pydantic and Zod/TypeScript interfaces to ensure wire parity.

---

## 3. Pull Request Process

1. **Create a branch**: Follow conventional branch naming (`feat/`, `fix/`, `chore/`, `docs/`).
2. **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
   Example: `feat(api): add new security analyzer for secrets`
3. **Draft PR**: Open a draft PR early if you want feedback on the architecture.
4. **CI/CD**: Wait for GitHub Actions to complete. Ensure no regressions are introduced.

### Adding a new Analyzer

If you are contributing a new static analyzer to the Pipeline, follow these steps:

1. Create a class implementing the `Analyzer` protocol in `apps/api/app/features/analysis/analyzers/`.
2. Register it in `registry.py`.
3. Add unit tests in `tests/test_analysis_analyzers.py`.

### Architecture Decision Records (ADR)

If your PR changes the fundamental architecture, data model, or introduces a new dependency (e.g., adding Redis for distributed locking), you must submit an ADR to the `docs/adr/` directory first for discussion.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and welcoming environment for all contributors. Hostile behavior will not be tolerated.
