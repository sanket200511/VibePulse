# Engineering Story (ADR / Overview)

## Context

VibePulse's initial iteration provided fragmented visibility. Users had to visit the `Events` page for the raw feed, the `Projects` page for high-level summaries, and the `Sessions` page for deep dives into replay or architecture.

In Sprint PX-10.0, the **Engineering Story** dashboard was introduced as the unified, flagship experience of VibePulse. The goal is to answer a single question immediately upon viewing: _"What happened while this software was being built?"_

## Purpose

The Engineering Story is a single-pane-of-glass narrative that combines Project Intelligence, Architecture Evolution, Security Findings, Session Journeys, and Replays into one cohesive timeline. Instead of presenting charts and disconnected data grids, it presents a continuous, deterministic story of software creation.

## Information Hierarchy

1. **Hero**: Project identity paired with immediate, high-level metrics (Total Security Issues, Architecture Changes).
2. **Project Pulse**: The temporal constellation visualization, mapping the density and timeline of engineering sessions.
3. **Session Journey**: A horizontal visualization showing the progression of sessions from active to completed.
4. **Engineering Journey**: A unified vertical timeline combining all session bounds, architectural changes, and security findings across the entire project lifespan.
5. **Architecture & Security Evolution**: Aggregated summaries of deterministic structural events grouped by session, alongside a chronological ledger of security risks.

## Truth Boundary

As per VibePulse's core philosophy, the Engineering Story contains **no AI hallucinations, no inferred productivity scores, and no estimated effort metrics**. Every timeline node, architecture change, and security finding is deterministically traced back to a raw `AnalyzableEvent` captured by the filesystem daemon.

## Navigation & Replay Integration

The Engineering Story is highly interactive. Every deterministically derived observation (like a new class being added or a security vulnerability being introduced) features a direct **Replay Shortcut**. Clicking this shortcut deep-links the user directly into the Replay Engine (`/sessions/{sessionId}/replay?event={eventId}`), automatically seeking the player to the precise keystroke that caused the architectural evolution.
