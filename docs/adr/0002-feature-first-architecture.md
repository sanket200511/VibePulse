# ADR 0002 – Feature-First Architecture

| Field       | Value                       |
|-------------|-----------------------------|
| **Status**  | Accepted                    |
| **Date**    | 2025-01-01                  |
| **Deciders**| Engineering Team            |

---

## Context

As the platform grows, the codebase will contain many domain areas:

- Event Collection
- Session Replay
- AI Fingerprinting
- Architecture Drift Detection
- Project Health
- Technical Debt Analysis

Each domain area has its own HTTP router, data models, service logic, schemas, and tests.

### Options considered

**Option A – Layer-first (classic MVC)**
```
app/
  routers/
    health.py
    events.py
    sessions.py
  models/
    event.py
    session.py
  schemas/
    event.py
    session.py
  services/
    event_service.py
```

**Option B – Feature-first (chosen)**
```
app/
  features/
    health/
      router.py
      schemas.py
      service.py   (future)
      models.py    (future)
      tests/
    events/
      router.py
      schemas.py
      service.py
      models.py
      tests/
```

---

## Decision

Use **feature-first (vertical slice) architecture** for all applications.

Each feature module is a self-contained vertical slice that owns:
- HTTP router / view
- Request/response schemas
- Domain service(s)
- ORM models
- Feature-scoped tests

The `core/` directory holds horizontal cross-cutting concerns only: database session, config, security middleware, and base exceptions.

---

## Consequences

### Positive
- **Navigability**: to understand "how events work" you read one directory, not five.
- **Isolation**: changes to the `events` feature cannot accidentally break `sessions` schemas.
- **AI-friendly**: large language models asked to work on a feature get a coherent context window — one directory — rather than fragments scattered across layers.
- **Onboarding**: new engineers can own a feature end-to-end without understanding the entire codebase.
- **Deletion**: removing a feature is `rm -rf app/features/feature_name` with minimal residue.

### Negative / Mitigations
- Shared domain logic must live in `core/` or a dedicated shared feature. Mitigation: enforce a rule that `features/` modules may not import from sibling features; shared logic is extracted to `core/domain/`.
- Slightly more boilerplate per feature at creation time. Mitigation: a `scripts/new-feature.sh` scaffolding script (Sprint 1).

---

## Application to the React Dashboard

The same principle applies to `apps/dashboard/src/`:

```
src/
  pages/
    dashboard/
      DashboardPage.tsx
      useDashboardData.ts   (future)
    sessions/
      SessionsPage.tsx
    health/
      HealthPage.tsx
  components/           ← truly reusable, domain-agnostic components only
  lib/                  ← utilities (api client, formatters)
```

---

## References

- [Vertical Slice Architecture (Jimmy Bogard)](https://jimmybogard.com/vertical-slice-architecture/)
- [Feature-Sliced Design](https://feature-sliced.design/)
