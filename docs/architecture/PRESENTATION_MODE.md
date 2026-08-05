# Presentation Mode Architecture (PX-11.1)

## Overview

Presentation Mode is a top-level orchestrator that guides first-time users through the VibePulse capabilities via a cinematic, Apple Keynote-style walkthrough. It controls routing and highlights specific components with a dynamic spotlight overlay, ensuring users understand the determinism and power of the system without manual exploration.

## State Machine

The core engine (`PresentationContext`) operates a finite state machine:

- `running`: Boolean indicating if the tour is active.
- `stepIndex`: Integer tracking current progression.
- `currentStep`: Computed step from `TourSteps.ts`.

It provides actions: `next()`, `previous()`, `start()`, `stop()`, `goTo(step)`.

## Routing & Navigation

Each `TourStep` defines a `routeResolver(context)`. The Engine executes this resolver and triggers a React Router `navigate()`. The engine waits until the target route mounts and the specific element (marked with `data-tour="..."`) is available before illuminating the Spotlight.

## Spotlight

The `PresentationOverlay` is an absolute positioned, high-z-index overlay. Instead of cloning DOM elements, it relies on a `clip-path` (or multiple overlapping transparent divs / box-shadow approach) that creates a window over the target element's bounding rect.

- **Performance**: The spotlight uses `ResizeObserver` and `IntersectionObserver` to track the target without continuous `requestAnimationFrame` polling unless animating.
- **Responsiveness**: The overlay dynamically adjusts on window resize or scroll.

## Truth Boundary

Presentation Mode is completely non-destructive. It does not fabricate sessions, fake telemetry, or create shadow DOMs. It strictly orbits the pre-existing, TanStack Query-backed dashboards, illuminating the UI identically to how a user would manually interact with it.

## Future Extensions

- Support for branching tours based on user role (e.g., Security Engineer vs. Architect).
- Tour auto-play with predefined wait timings per step.
