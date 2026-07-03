# Engineering Guide – VibePulse

This document codifies the engineering principles, conventions, and standards for VibePulse. All contributors — human and AI — are expected to follow these guidelines.

---

## Philosophy

> Build things that are easy to understand, easy to change, and hard to break.

### Core Principles

**Simplicity over cleverness**  
Prefer the obvious solution. Clever code is hard to read, hard to debug, and hard to modify. If you find yourself writing something clever, ask whether a simpler approach exists.

**Feature-first organisation**  
Group code by what it does, not how it is implemented. A developer working on "events" should be able to navigate to one directory and find everything: router, schemas, service, models, tests.

**Strong typing, everywhere**  
TypeScript strict mode. Python type annotations on all functions. Pydantic for all API contracts. Types are documentation that the compiler enforces.

**Domain-Driven Design vocabulary**  
Use the domain language in code. An `Event` is a `DomainEvent`, not an `EventDTO`. A `HealthScore` is a `HealthScore`, not a `MetricResult`. Code should read like the domain it models.

**SOLID principles**

- Single responsibility: one reason to change.
- Open/closed: extend behaviour without modifying existing code.
- Liskov substitution: subtypes must be substitutable for their base types.
- Interface segregation: small, focused interfaces.
- Dependency inversion: depend on abstractions, not concretions.

---

## Code Style

### TypeScript / JavaScript

```typescript
// ✅ Good: explicit types, named exports, descriptive names
export interface FileChangedEvent {
  id: string;
  filePath: string;
  timestamp: Date;
  changeType: "added" | "modified" | "removed";
}

export function parseFileEvent(raw: unknown): FileChangedEvent {
  // ...
}

// ❌ Bad: implicit any, default export, vague names
export default function process(data: any) {
  // ...
}
```

- Use `interface` for object shapes, `type` for unions and aliases.
- Use `const` arrow functions for React components and utilities.
- `async/await` everywhere — never `.then()/.catch()` chains.
- Imports: external libraries first, then internal packages (`@vibepulse/*`), then relative imports. Always `type` imports for type-only usage.

### Python

```python
# ✅ Good: type annotations, Pydantic schemas, async handlers
async def ingest_event(
    event: FileChangedEvent,
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    result = await event_service.create(db, event)
    return EventResponse.model_validate(result)

# ❌ Bad: no types, raw dict, sync handler
def ingest(data):
    return {"id": data["id"]}
```

- Every function must have type annotations (input and return).
- Use `pydantic.BaseModel` for all API schemas.
- Use `sqlalchemy.orm.DeclarativeBase` for ORM models.
- Prefer `async def` for all FastAPI route handlers and service methods.
- Use `ruff` for formatting and linting — never configure anything that conflicts with ruff.

---

## Git Conventions

### Commit Messages — Conventional Commits

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`

**Examples**:

```
feat(api): add health check endpoint
fix(daemon): handle SIGTERM gracefully on Windows
docs(adr): add ADR 0004 for authentication strategy
chore(deps): upgrade fastapi to 0.115.6
```

### Branch Naming

```
feat/<short-description>
fix/<short-description>
chore/<short-description>
docs/<short-description>
```

### Pull Requests

- One logical change per PR.
- Title follows the same Conventional Commits format.
- PRs must pass CI (lint, typecheck) before merge.
- Breaking changes must include a migration guide in the PR body.

---

## Testing Standards

### Principles

- Test behaviour, not implementation.
- A test should fail only when observable behaviour changes, not when internals are refactored.
- Prefer integration tests over unit tests where the integration is the interesting part.

### Python (pytest)

```
apps/api/
  tests/
    features/
      health/
        test_health_router.py
      events/
        test_event_service.py
    conftest.py
```

- Use `pytest-asyncio` for async tests.
- Use `httpx.AsyncClient` with `ASGITransport` for router tests — avoid starting a real server.
- Use `pytest.fixture` for database sessions, test clients, and shared test data.

### TypeScript (Vitest — Sprint 1)

- Test files live adjacent to the code they test: `foo.ts` → `foo.test.ts`.
- React component tests use Testing Library.
- Mock external I/O at the boundary, not the logic under test: the daemon's
  `http-publisher.test.ts` stubs global `fetch` (`vi.stubGlobal`) rather than mocking
  the publisher itself; filesystem-dependent tests (`event-builder.test.ts`) use real
  temp directories (`mkdtempSync`) instead of mocking `fs`.
- `pnpm test` (root) runs every package's `test` script via Turborepo.

### Daemon transport abstractions

When the daemon needs to send data somewhere (the API, a future message broker), define
an interface (e.g. `Publisher`) and inject an implementation, rather than having the
watcher/observer call `fetch` or a client library directly. This keeps the detection
logic (chokidar watching, event building) independent of the transport, so swapping
HTTP for Redis Streams or another broker later is additive — see
[ADR 0003](./docs/adr/0003-event-driven-core.md).

---

## Environment Variables

Every environment variable must:

1. Be documented in the relevant `.env.example`.
2. Be validated at startup (Pydantic `Settings` for Python, `requireEnv()` / `parsePort()` from `@vibepulse/config` for Node.js).
3. Never have a hardcoded production default — only safe development defaults.

---

## Error Handling

**In the API**:

- Domain errors (`NotFoundError`, `ConflictError`) are mapped to HTTP status codes by exception handlers.
- Never return a raw Python exception to the client.
- Always include a machine-readable `code` field alongside the human-readable `message`.

**In the Daemon**:

- Use the `logger` utility — never `console.log`.
- Fatal errors on startup result in `process.exit(1)` with a clear error message.
- Non-fatal errors are logged and the daemon continues.

**In the Dashboard**:

- Use TanStack Query error states for API failures — never `try/catch` inside components.
- Display user-friendly error messages that explain the problem and suggest an action.
- Log technical details to the browser console for debugging.

---

## Performance Expectations

- API endpoints: p95 < 100ms (read), p95 < 200ms (write)
- Dashboard: Time to Interactive < 2s on a modern machine
- Daemon: event emission latency < 50ms from file change detection

These are targets for Sprint 1+. Sprint 0 establishes the foundation.

---

## Security Baseline

Even in development:

- No secrets in source code or git history.
- Dependencies are pinned (`pnpm-lock.yaml`, `uv.lock`).
- CORS origins are explicitly configured — never `*` in production.
- HTTP-only, SameSite cookies for auth tokens (when auth is added, Sprint 3).
- All database queries go through SQLAlchemy — no raw SQL string interpolation.

---

## Adding Dependencies

Before adding any new dependency, ask:

1. **Is it necessary?** Can the functionality be implemented with what we already have?
2. **Is it maintained?** Check last commit date and open issues.
3. **Is it appropriately scoped?** A dashboard animation library does not belong in `packages/config`.
4. **Does it have TypeScript types?** Prefer packages with bundled types or a well-maintained `@types/` package.

For Python: prefer packages with typed stubs (`py.typed` marker or `typeshed` coverage).

---

## Architecture Decisions

Significant architectural decisions are recorded as Architecture Decision Records in `docs/adr/`.

Before making a decision that:

- Introduces a new infrastructure component
- Changes a cross-cutting concern (auth, logging, error handling)
- Affects the public API contract
- Changes the monorepo structure

…write an ADR first. The ADR describes the context, options considered, decision made, and consequences. It is a permanent record of why the codebase is the way it is.
