# Architecture Time Machine (ADR / Overview)

## Context

VibePulse's initial `Timeline` engine grouped identical file edits together to reduce noise, acting more like an aggregated activity feed than a forensic trail. While excellent for understanding overall session velocity, it buried deterministic structural insights (e.g., exactly when a `FUNCTION_ADDED` or `HARDCODED_PASSWORD` occurred) inside collapsed groupings.

Sprint PX-9.4 introduced the **Architecture Time Machine**, transforming VibePulse into a deterministic engineering journal.

## Core Design

The Architecture Time Machine (`app.features.architecture_timeline`) unpacks every analysis finding into an independent timeline marker.

Instead of showing:

- 09:12 - 09:14 (Grouped: 40 edits to auth.py)

The Time Machine shows a perfectly linear, timestamped progression:

1. `09:12` SESSION_START
2. `09:13` FUNCTION_ADDED: `login_user` (in auth.py)
3. `09:13` SECURITY_FINDING: `Hardcoded Password` (in auth.py)
4. `09:14` TODO_INTRODUCED: `TODO SECURITY` (in auth.py)
5. `09:20` SESSION_END

## Truth Boundary

This implementation strictly adheres to the Truth Boundary.

- **Allowed:** Extracting distinct findings (`FUNCTION_ADDED`, `IMPORT_REMOVED`, `SECURITY_FINDING`) mapped directly to their observation timestamp.
- **Forbidden:** Deriving a "Developer became productive" or "Architecture improved" status based on the concentration or type of events.

## Components

- `ArchitectureTimelineBuilder` (Domain): Extracts observations from `code_evolution` and `security_guardian` analyses, creating `ArchitectureTimelineEntry` items sorted strictly by time.
- `ArchitectureTimelineRead` (API): Exposes `GET /sessions/{id}/architecture`.
- `ArchitectureTimelinePanel` (Frontend): Renders a rich Git-like history on the `SessionDetailsPage`, enabling the user to immediately jump into a Replay exactly when a structural or security change occurred.
