# VibePulse Screenshot Plan

This document defines the static visual assets required for the README, documentation, and promotional materials.

## Global Guidelines

- **Browser Size**: 1440x900 (Standard Desktop)
- **Theme**: Dark Mode (Default VibePulse theme)
- **Padding**: 24px invisible padding for drop shadows in composite images
- **Resolution**: Retina (2x) output for crisp text

---

### 1. Hero Image: The Replay Engine

- **Screen Name**: Session Replay
- **Route**: `/sessions/:sessionId/replay`
- **Purpose**: Primary README hero image. Shows the platform's most unique capability.
- **Ideal Browser Size**: 1440x900
- **Light/Dark**: Dark Mode
- **Annotations**: None (keep it clean for the hero).
- **Caption**: "VibePulse Replay Engine: Play back engineering sessions chronologically with semantic chapters."
- **Filename**: `hero-replay-engine.png`

### 2. Engineering DNA

- **Screen Name**: Engineering DNA Breakdown
- **Route**: `/projects/:projectId/dna`
- **Purpose**: Demonstrate static analysis and architecture understanding.
- **Ideal Browser Size**: 1200x800
- **Light/Dark**: Dark Mode
- **Annotations**: Highlight the "TODOs Resolved" badge and a specific AST extracted function block.
- **Caption**: "Engineering DNA: Extracting structural architecture without executing code."
- **Filename**: `engineering-dna.png`

### 3. Investigation Engine

- **Screen Name**: Investigation Search
- **Route**: `/investigate`
- **Purpose**: Show the cross-session query capabilities and Kibana-like interface.
- **Ideal Browser Size**: 1440x900
- **Light/Dark**: Dark Mode
- **Annotations**: Callout on the filter bar showing `event_type: FILE_MODIFIED` and `language: python`.
- **Caption**: "Investigation Engine: Filter, correlate, and discover deterministic engineering events."
- **Filename**: `investigation-engine.png`

### 4. AI Provenance

- **Screen Name**: AI Authorship Provenance
- **Route**: `/sessions/:sessionId/provenance`
- **Purpose**: Highlight the AI fingerprinting metrics and statistical analysis.
- **Ideal Browser Size**: 1024x768
- **Light/Dark**: Dark Mode
- **Annotations**: Arrow pointing to the probability distribution graph.
- **Caption**: "AI Provenance: Statistically detect the likelihood of AI-assisted authorship."
- **Filename**: `ai-provenance.png`

### 5. Time Machine

- **Screen Name**: Project Time Machine
- **Route**: `/projects/:projectId/time-machine`
- **Purpose**: Show macro-level codebase structural evolution.
- **Ideal Browser Size**: 1200x800
- **Light/Dark**: Light Mode (to provide visual contrast in the README).
- **Annotations**: Highlight the timeline slider at the bottom.
- **Caption**: "Time Machine: Roll back and visualize the structural state of your repository at any point."
- **Filename**: `time-machine.png`

### 6. Architecture Timeline

- **Screen Name**: Session Timeline
- **Route**: `/sessions/:sessionId/timeline`
- **Purpose**: Display the raw chronological event grouping and structural markers.
- **Ideal Browser Size**: 1024x1024 (Square crop)
- **Light/Dark**: Dark Mode
- **Annotations**: Highlight a `SESSION_START` and `IDLE_GAP` marker.
- **Caption**: "Architecture Timeline: Grouped, semantic file events mapped over time."
- **Filename**: `architecture-timeline.png`
