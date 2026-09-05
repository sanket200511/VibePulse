# Sprint PX-12.0: Engineering Search & Investigation Engine - Architecture & Implementation Plan

## 1. Architecture Understanding

DepRadar is a deterministic engineering observability platform built on an event-sourced architecture.

- **Event Pipeline:** `development_events` acts as the system's ledger, storing immutable `DevelopmentEvent` records (file creations, modifications, deletions, AI tool executions, etc.).
- **Analysis Pipeline:** Asynchronous `Analyzer` plugins (Static Analysis, Security, Code Evolution) process each event and store results as JSONB in `event_analyses`.
- **Read Models (Feature Modules):** Features like `Engineering DNA`, `Architecture Timeline`, and `AI Provenance` reconstruct history by joining `development_events` and `event_analyses`. They do not duplicate state.
- **Client State & Live Observability:** The React frontend uses TanStack Query to cache these read models and WebSockets (`/ws/events`) to invalidate caches in real-time.
- **Time Machine:** The `TimeMachineContext` performs deterministic client-side array slicing based on a global `selectedTime` timestamp, seamlessly hiding "future" events.

## 2. Existing Reusable Components

- **Data Fetchers:** `app.features.timeline.service._fetch_session_events` and `_fetch_analyses` efficiently batch-load events and their analyses.
- **Timeline Builders:** `build_architecture_timeline` converts raw events and analyses into a unified chronologically sorted structure.
- **Frontend Contexts:** `TimeMachineContext` already calculates `effectiveTime` and `visibleEntries`.
- **Search UI Patterns:** Existing lucide-react icons, Tailwind CSS classes, and `LoadingState`/`ErrorState` components are available for the new Investigation UI.

## 3. Data & Query Flow

1. **User Query Input:** A user types `severity:HIGH file:auth.py authentication` into the Investigation UI Command Palette.
2. **API Request:** Frontend calls `GET /projects/{id}/investigation/search?q=severity:HIGH%20file:auth.py%20authentication`.
3. **Query Parsing:** The backend (`features/investigation/service.py`) parses the query into structured filters (`severity="HIGH"`, `file="auth.py"`) and a generic full-text query (`"authentication"`).
4. **Database Retrieval:** Using SQLAlchemy, the service constructs a dynamic query against `development_events` joined with `event_analyses`.
   - For full-text search on JSONB, we will cast the metadata/analyses text or use `ilike` for deterministic, exact matches.
5. **Timeline Projection:** The service maps the results into a unified `InvestigationResult` model (similar to `ArchitectureTimelineEntry` but enriched with DNA, Replay, and AI contexts).
6. **Client Render:** `InvestigationPage.tsx` displays the results. If `TimeMachineMode === "TIME_TRAVEL"`, the UI filters results locally so only events `timestamp <= effectiveTime` are shown.

## 4. Truth Boundary Review

- **Enforced:** The Investigation Engine will exclusively query deterministic, pre-computed observations.
- **No Hallucinations:** Search results will not summarize "why" a change happened. They will only display "what" happened (e.g., "AI Tool Executed", "Function auth_user Added").
- **Hybrid Search Compliance:** The suggested full-text search will only match against recorded factual strings (file names, class names, rule IDs) avoiding any intent-based semantic search or embeddings.

## 5. Performance Considerations

- **Avoid Full Table Scans:** Querying JSONB structures (`event_analyses`) can be slow. We will leverage PostgreSQL GIN indexing on `event_analyses.findings` if necessary, or restrict the search space by `project_id` and `session_id` first.
- **Backend Aggregation vs. Frontend Filtering:** If a project has thousands of events, pagination or limit/offset may be required. For Sprint PX-12.0, we will return a bounded array and allow React memoization and TanStack Query to keep the UI snappy.
- **Websocket Granularity:** When a WS event fires, TanStack Query will invalidate the search query cache, causing a seamless refetch without a full page reload.

## 6. Proposed Architecture & Implementation Phases

### Phase 1: Backend Domain & Query Engine (`apps/api/app/features/investigation`)

- **`domain.py`**: Define the Query Parser (e.g., `parse_investigation_query(q: str) -> ParsedQuery`).
- **`schemas.py`**: Define `InvestigationResult` and `InvestigationResponse`.
- **`repository.py`**: Build the dynamic SQLAlchemy query engine filtering by Project, Session, JSONB fields (Severity, AI Provider, Architecture Kind), and full-text matching.
- **`service.py`**: Orchestrate the repository fetch and map to schemas.
- **`router.py`**: Expose `/projects/{id}/investigation/search` and other scoped endpoints.

### Phase 2: Frontend Command Palette & UI (`apps/dashboard/src/pages/investigation`)

- **`InvestigationPage.tsx`**: The premium standalone UI with a left sidebar (filters) and main timeline area.
- **`InvestigationCommandPalette.tsx`**: A smart input box parsing tags (`file:`, `severity:`) visually.
- **`InvestigationCard.tsx`**: The chronological result component, featuring immediate shortcut links to Engineering DNA, Time Machine Replay, and AI Provenance.

### Phase 3: Cross-Feature Integrations

- **Time Machine**: Inject the `TimeMachineContext` into `InvestigationPage` so search results instantly truncate when the user scrubs backward.
- **Presentation Mode**: Update `TourSteps.ts` to include the Engineering Investigation step.
- **Navigation**: Update `App.tsx` and `AppLayout.tsx` (if a global search icon is needed) to route to the new page.

### Phase 4: Testing & Documentation

- Write `test_investigation.py` to ensure the dynamic query engine correctly parses hybrid queries and returns deterministic results.
- Create `ENGINEERING_INVESTIGATION.md`.
- Run `pnpm typecheck`, `ruff`, `pyright`, and accessibility audits.

## 7. Files to Create/Modify

- **Create**:
  - `apps/api/app/features/investigation/__init__.py`
  - `apps/api/app/features/investigation/domain.py`
  - `apps/api/app/features/investigation/schemas.py`
  - `apps/api/app/features/investigation/service.py`
  - `apps/api/app/features/investigation/repository.py`
  - `apps/api/app/features/investigation/router.py`
  - `apps/api/tests/features/investigation/test_investigation.py`
  - `apps/dashboard/src/pages/investigation/InvestigationPage.tsx`
  - `apps/dashboard/src/pages/investigation/useInvestigation.ts`
  - `docs/architecture/ENGINEERING_INVESTIGATION.md`
- **Modify**:
  - `apps/api/app/main.py` (Include router)
  - `apps/dashboard/src/App.tsx` (Add routes)
  - `apps/dashboard/src/components/presentation/TourSteps.ts`

## 8. Risks

- **JSONB Query Performance**: Doing text search inside deeply nested `event_analyses` JSONB might be slow. _Mitigation_: Restrict query scope by project/session first, and use optimized SQLAlchemy `->>` operators where possible.

## 9. Final Verdict

The architecture is sound and perfectly aligned with DepRadar's principles. Integrating a hybrid search mechanism respects the Truth Boundary as long as we constrain the text search to deterministic observation records.

Awaiting your approval to proceed with **PHASE 2 — Engineering Search Engine**.
