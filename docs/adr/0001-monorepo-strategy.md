# ADR 0001 – Monorepo Strategy

| Field       | Value                       |
|-------------|-----------------------------|
| **Status**  | Accepted                    |
| **Date**    | 2025-01-01                  |
| **Deciders**| Engineering Team            |

---

## Context

DepRadar is composed of multiple tightly-coupled components:

- **Dashboard** – React web application (end-user interface)
- **API** – FastAPI backend (data ingestion, serving)
- **Daemon** – Node.js file-system observer (runs on developer's machine)
- **Shared packages** – UI primitives, configuration utilities, TypeScript types

These components share domain types, design tokens, and configuration conventions. They are developed by the same team and versioned together. During the AI coding era, the codebase will be read and modified frequently by AI coding assistants that benefit from having full context in one location.

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Monorepo** (chosen) | Atomic commits across packages, shared tooling, unified CI, easy cross-package refactoring | Larger clone size, more complex tooling setup |
| **Polyrepo** | Clean boundaries, independent versioning | Cross-repo PRs, duplicated tooling, version drift between packages, context fragmentation for AI tools |
| **Hybrid** (shared packages only) | Middle ground | Adds polyrepo complexity without the benefits |

---

## Decision

Use a **monorepo** managed with **pnpm workspaces** and **Turborepo**.

- **pnpm workspaces** — native package manager support for multiple packages; hard-links deduplicate `node_modules` efficiently.
- **Turborepo** — orchestrates build and lint tasks across packages with intelligent caching; aware of dependency graphs so tasks only re-run when inputs change.

---

## Consequences

### Positive
- A single `git clone` gives contributors full context.
- Shared TypeScript types enforced across the entire stack at the repository level.
- One CI pipeline, one lint configuration, one formatter.
- Atomic commits that span API + dashboard + daemon changes.
- AI coding assistants (Copilot, Claude, Cursor) operate on the full codebase context.

### Negative / Mitigations
- The Python API (`apps/api`) cannot participate in Turborepo's JS task graph directly. Mitigation: a thin `package.json` wrapper in `apps/api` provides `dev`, `lint`, and `typecheck` scripts that delegate to `uv` / `ruff`, making the API look like any other Turbo task.
- Developers need `pnpm`, `node`, `python 3.12`, and `uv` installed. Mitigation: documented in README; Docker Compose covers the infrastructure layer.

---

## References

- [Turborepo documentation](https://turbo.build/repo)
- [pnpm workspaces documentation](https://pnpm.io/workspaces)
