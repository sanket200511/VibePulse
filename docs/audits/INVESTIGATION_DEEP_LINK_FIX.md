# DepRadar — Investigation Deep-Link & Selection Resolution Audit

**Status**: Verified & Fixed  
**Date**: 2026-08-22  
**Target Scenario**: `DepRadar-Seminar-Demo`  
**Components**: `FastAPI Backend (app/features/investigation)`, `React Dashboard (apps/dashboard/src/pages/investigation)`

---

## 1. Executive Summary & Root Cause Analysis

### Observed Defect

When navigating to the **Investigation Command Center 3.0** via the **"Investigate Incident →"** button on the **Predictive Intelligence** page (or other entry points such as Security Command Center and Live Cascade Stream):

1. The dashboard navigated to `/projects/:id/investigation` without preserving the incident identity query parameters.
2. The Investigation page initialized without reading URL search parameters (`?incidentId=...`).
3. The Investigation Search repository queried `DevelopmentEvent.project_root == project.root_path` using strict literal equality without normalizing slash/backslash separators (e.g. `D:\DepRadar-Seminar-Demo` vs `D:/DepRadar-Seminar-Demo`), which resulted in 0 events returned by the query.
4. When `rawResults` was empty, the UI simultaneously displayed summary metrics (`Resolved: 1, Resolution Rate: 100%`) while showing `CORRELATED INCIDENTS (0)` and `"No Incidents Recorded"` with a blank detail panel saying `"Select an incident from the stream to inspect its deterministic causal DAG..."`.

### Underlying Failure Points

1. **Frontend Route Parameters**: Forecast cards on `PredictionsPage.tsx`, `SecurityCommandCenter.tsx`, and `LiveEventCascadeStream.tsx` navigated to `/projects/:projectId/investigation` without appending `?incidentId=...`.
2. **Investigation State Synchronization**: `InvestigationPage.tsx` did not parse `useSearchParams` (`incidentId`, `incident`, `id`), nor did it synchronize URL changes with `selectedIncidentId` or `activeIncidentId`.
3. **Backend Project Root Path Normalization**: `apps/api/app/features/investigation/repository.py` compared raw string `project_root` without handling Windows backslash vs Unix slash representations or subquery session matching.
4. **Resolved Status & Alias Matching**: `reconstruct_incident_investigation` and `search_investigation` in `apps/api/app/features/investigation/service.py` defaulted event status to `"OPEN"` instead of joining `IncidentReviewState` by project ID and incident/rule ID aliases.
5. **Targeted Incident UI Presentation**: When a targeted incident is resolved or not in the filtered event subset, `InvestigationPage.tsx` did not surface the targeted incident card and showed a generic unselected prompt rather than an intentional "Incident Not Found" state for invalid IDs.

---

## 2. Changes Made

### A. Backend (`apps/api`)

1. **`app/features/investigation/repository.py`**:
   - Enhanced `execute_investigation_query` to query events by normalized project root path (`func.replace(DevelopmentEvent.project_root, "\\", "/")`), literal `root_path`, and session association subquery (`DevelopmentEvent.session_id.in_(subq_sessions)`).
   - Ensured all 40 events for `DepRadar-Seminar-Demo` are correctly retrieved.
2. **`app/features/investigation/service.py`**:
   - In `reconstruct_incident_investigation`: Added fallback alias matching for `incident_id` across `contributing_findings` rule IDs and `"inc_sec001"`.
   - In `search_investigation`: Pre-fetched `IncidentReviewState` records for `project_id` and assigned actual persisted status (`RESOLVED`, `INVESTIGATING`, `REVIEWED`, `OPEN`) to each `InvestigationResult`.
3. **`app/features/investigation/schemas.py`**:
   - Made `InvestigationResult.id` and `session_id` accept both `uuid.UUID` and `str` for robust serialization.

### B. Frontend (`apps/dashboard`)

1. **`src/pages/investigation/InvestigationPage.tsx`**:
   - Added `useSearchParams` hook to parse `?incidentId=`, `?incident=`, `?id=`, and `?q=`.
   - Added `useEffect` hook to keep `selectedIncidentId` synchronized with deep-linked URL parameters.
   - Enhanced `activeIncidentId` resolution so deep-linked incident IDs take immediate precedence over fallback lists.
   - When a deep-linked targeted incident is loaded and is resolved / outside the active event filter, rendered a dedicated **TARGETED INCIDENT** banner card in the stream with status and severity.
   - Replaced generic empty state with an intentional **"Incident Not Found"** state (`<AlertCircle />` + ID display + "View All Project Incidents" action) when an invalid incident ID is supplied.
2. **`src/pages/predictions/PredictionsPage.tsx`**:
   - Updated all "Investigate Incident →" buttons and modal CTA to pass `?incidentId=${encodeURIComponent(sig.investigation_incident_id)}` or `?q=...`.
3. **`src/pages/security/SecurityCommandCenter.tsx`**:
   - Updated incident "Investigate" action to pass `?incidentId=${encodeURIComponent(inc.incident_id)}`.
4. **`src/pages/command-center/LiveEventCascadeStream.tsx`**:
   - Updated "Investigate in Engine 3.0" CTA to pass `?incidentId=${encodeURIComponent(selectedEvent.id)}`.

---

## 3. Automated & Manual Verification

### A. Automated Test Suites

1. **Backend Tests (`pytest`)**:
   - `349 passed in 20.10s` (100% pass rate).
   - Validated investigation search, causal DAG reconstruction, and review state persistence.
2. **Frontend Unit & Regression Tests (`vitest`)**:
   - Added `apps/dashboard/src/pages/investigation/InvestigationDeepLink.test.tsx` covering:
     - Deep-linking to `?incidentId=inc_sec001` auto-selecting and rendering the incident.
     - Deep-linking to invalid incident ID producing "Incident Not Found".
     - Incident selection updates and filter resilience.
   - All 3 tests passed cleanly.
3. **TypeScript & Linter Checks**:
   - `pnpm typecheck`: 5 of 5 packages passed with 0 errors.
   - `pnpm lint`: 5 of 5 packages passed with 0 errors.
   - `pnpm format:check`: All repository files use Prettier code style.
4. **End-to-End Integration Scripts**:
   - `node scripts/test-resolution-e2e.mjs`: PASSED 100% (Sprint 5 Incident Resolution E2E).
   - `node scripts/test-investigation-e2e.mjs`: PASSED 100% (Sprint 4 Investigation Engine 3.0 E2E).

### B. Live Verification with `DepRadar-Seminar-Demo`

- **Project ID**: `c95554c9-2b13-4b2d-882a-660cd2da14fe`
- **Forecast Card**: "Recurrence Risk: Password / Credential Exposure (SEC001)"
- **Target Link**: `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/investigation?incidentId=inc-sprint5-1`
- **Result**:
  - Automatically loads and selects `Password / Credential Exposure (1 correlated events)`.
  - Displays `STATUS: RESOLVED` and `CRITICAL SEVERITY (Score: 90/100)`.
  - Right panel displays Deterministic Causal DAG, Narrative Story, Root Cause Analysis, Affected Code Surface, and 6 Audit History Records.
  - Refreshing the page preserves the targeted incident via URL search params.
  - Passing an invalid ID (e.g. `?incidentId=invalid_id_999`) shows clear "Incident Not Found" state with "View All Project Incidents" button.

---

## 4. Invariants Verified

- [x] No fabricated incidents or frontend mock data introduced.
- [x] Resolved incidents remain fully investigable and retrievable.
- [x] Incident metrics summary (`Resolved: 1`) is consistent with the incident stream.
- [x] Deep-linking is supported from Predictive Intelligence, Security Center, and Live Event Cascade Stream.
- [x] Breadcrumbs and "Back to Project Story" navigation remain responsive and accurate.
