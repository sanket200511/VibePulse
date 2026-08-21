# VibePulse — Project Intelligence & Engineering DNA

> **Sprint 2 Architectural Specification & Verification Reference**

---

## 1. Architectural Philosophy: Derived Projection vs. Source of Truth

In VibePulse, **Project Intelligence is a derived projection**.

- **PostgreSQL `development_events`, `sessions`, and `event_analyses`** remain the authoritative, historical source of truth.
- `project_contexts` acts as a **materialized projection / cache layer** that speeds up queries for the Dashboard and AI agents.
- **Reconstructibility Guarantee**: Deleting or invalidating the `project_contexts` cache row never destroys historical telemetry. Any recalculation triggered via `POST /api/projects/{id}/context/refresh` re-aggregates historical evidence and produces a semantically identical context model.

```
┌────────────────────────────────────────────────────────┐
│   Authoritative Historical Evidence (PostgreSQL)       │
│  - development_events                                  │
│  - sessions                                            │
│  - event_analyses                                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (Pure Deterministic Projection)
┌────────────────────────────────────────────────────────┐
│   Project Context & Intelligence Materialized Cache    │
│  - Languages & Activity-Weighted Percentages           │
│  - Frameworks & Technologies with Evidence Provenance  │
│  - Architecture Signals & Topologies                   │
│  - Activity Heatmap (7x24 Matrix)                      │
│  - Engineering DNA & Development Focus                 │
│  - Git Intelligence & AST Metrics                      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Strict Evidence Provenance: OBSERVED vs. INFERRED vs. UNKNOWN

Every intelligence property projected by VibePulse is strictly classified into one of three tiers:

1. **`OBSERVED`**:
   - Directly backed by a concrete file path, lockfile, AST node, manifest declaration, or Git repository metadata.
   - Example: `FastAPI` detected because `app/main.py` exists and contains FastAPI entrypoint routes; `pnpm` detected from `pnpm-lock.yaml`.
2. **`INFERRED`**:
   - Derived from heuristic patterns or behavioral concentrations across multiple events.
   - Example: `Development Focus: Authentication & Security` inferred from a 7-day rolling window where >60% of file modifications touched security and authentication handlers.
3. **`UNKNOWN`**:
   - Unobserved or out-of-scope dimensions that telemetry cannot authoritatively prove.
   - Example: Cloud production cluster state or secret values.

---

## 3. Pure Detectors & Projection Engine

All projection algorithms reside in pure, stateless detector functions in [`apps/api/app/features/project_context/detectors.py`](file:///d:/VibeSync/apps/api/app/features/project_context/detectors.py):

- **`detect_languages`**: Calculates file counts, percentages, and 7-day recent activity weighting.
- **`detect_package_managers`**: Inspects lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `uv.lock`, `Cargo.lock`, etc.).
- **`detect_frameworks`**: Detects FastAPI, React, Pytest, Vitest, TailwindCSS, Next.js, and Express from manifests and file structures.
- **`detect_technologies`**: Discovers PostgreSQL, Redis, Docker, WebSockets, REST APIs, and SQLAlchemy.
- **`detect_architecture_signals`**: Identifies Backend Application, Frontend User Interface, Database & Persistence, Authentication & Security Subsystem, Automated Verification Suite, and Monorepo Workspace.
- **`detect_git_intelligence`**: Safely extracts Git repository status, active branch, latest commit hash, timestamp, and uncommitted change count with non-git filesystem fallbacks.
- **`compute_activity_heatmap`**: Constructs a 7-day × 24-hour event frequency matrix.
- **`determine_development_focus`**: Computes dominant active focus category over rolling time windows with insufficient history fallbacks (< 3 events).
- **`rank_file_activity`**: Ranks top modified files with event type compositions.

---

## 4. AI-Ready Export: `PROJECT_CONTEXT.md`

Calling `GET /api/projects/{id}/context/export?format=markdown` produces a complete, portable markdown document structured across 16 canonical sections:

1. **Project Identity**: Display name, UUID, root path, timestamps.
2. **Executive Summary**: Observed facts, inferred architecture, unknown boundaries.
3. **Languages**: Distribution table with share percentages and recent event weights.
4. **Frameworks**: Identified frameworks with classification badges and provenance.
5. **Technologies**: Runtimes, protocols, databases, and containers with evidence.
6. **Package Managers**: Manifests and lockfiles.
7. **Important Files**: Core entrypoints, config files, ranked by activity.
8. **Configuration Files**: Manifest roles and paths.
9. **Source Directories**: Standard source code roots.
10. **Test Directories**: Automated verification suites.
11. **Architecture Summary**: Topology (Monorepo / Standard) and Architecture Signals.
12. **Development Patterns & Focus**: Current active focus, rationale, and sample files.
13. **Security Posture**: AST findings, severity breakdown, top rules, and redaction verification.
14. **Activity Summary**: Event counts, session counts, and observation window.
15. **Development History**: Recent sessions, status, and languages.
16. **Security / Investigation History**: Critical findings and AST security evaluations.

### Secret Redaction Guarantee

All export operations run defense-in-depth regex redaction (`redact_sensitive_text`) to guarantee API keys, tokens, and credentials are replaced with `[REDACTED]`.

---

## 5. Verification & Reconstructibility Proof

The reconstructibility guarantee is validated by:

1. **Automated Backend Pytest Suite**: [`apps/api/tests/test_project_intelligence.py`](file:///d:/VibeSync/apps/api/tests/test_project_intelligence.py) (`301 passed in 17.61s`).
2. **Projection Proof Runner**: [`scripts/test-intelligence-projection.mjs`](file:///d:/VibeSync/scripts/test-intelligence-projection.mjs):
   - Creates a disposable project.
   - Ingests events into PostgreSQL.
   - Generates initial intelligence.
   - Deletes `project_contexts` cache row.
   - Triggers reprojection.
   - Verifies 100% semantic equivalence between initial and reconstructed models.
