# Dashboard Shell

Implemented in Sprint PX-1. This document describes the reusable application
shell every dashboard screen is built inside — not any individual screen's
content. See [docs/design/PRODUCT_EXPERIENCE.md](../design/PRODUCT_EXPERIENCE.md)
for the product-architecture decisions this implements; this document covers
only the resulting frontend structure and conventions.

## Structure

```
src/components/layout/
  AppLayout.tsx       Global shell: skip link, header, <main> landmark, <Outlet />
  Navigation.tsx       Contextual Navigation — the 3 fixed anchors
  nav-items.ts          Anchor definitions (route, label, icon)
  PageHeader.tsx        Per-screen title + description + trailing meta slot
  SectionContainer.tsx  Card-shaped grouping unit for related content

src/components/states/
  LoadingState.tsx      Skeleton + accessible status region
  EmptyState.tsx        Title + description + optional action
  ErrorState.tsx        role="alert" message

src/pages/<feature>/    One directory per screen, per CLAUDE.md convention
```

`AppLayout` is mounted once as a layout route in `App.tsx` (`<Route element={<AppLayout />}>`)
wrapping every page route. It owns the single `<main id="main-content">` landmark
for the whole app — page components render into it via `<Outlet />` and must not
render their own `<main>`.

## Navigation

Implements the Contextual Navigation model (PRODUCT_EXPERIENCE.md §4): a small,
permanently fixed anchor set — Workspace Home, Projects, History — rendered as a
slim top header bar. Nothing else lives here. Every other capability (Timeline,
Replay, Reflection, Health, and future features) is reached contextually from
within Session Detail, never as an additional top-level nav item — `nav-items.ts`
is not meant to grow with the feature set.

**Judgment call, flagged for review:** PRODUCT_EXPERIENCE.md §4 evaluates and
rejects a sidebar, a growing top nav, a hybrid model, and a command-palette as
the _primary_ navigation surface. Those rejections target models that grow with
the feature set. A top bar holding an intentionally fixed, small anchor set
(3 today, expected to stay near that size for years) was judged not to be the
pattern the document rejects, since it does not accrete. This interpretation is
a bet, not a re-litigation of the document — if a future sprint's screen
inventory disagrees, revisit here first.

## States

Every screen must render one of Loading / Empty / Error / Success — never a
bare blank container. Use `LoadingState` / `EmptyState` / `ErrorState` from
`src/components/states` rather than ad hoc conditionals; they encode the
accessibility contract (`role="status"` + `aria-live="polite"` for loading,
`role="alert"` for errors) so individual pages don't have to re-derive it.

## Accessibility

- One `<main>` landmark per app (not per page), supplied by `AppLayout`.
- Skip-to-content link precedes the header, targeting `#main-content`.
- `<nav aria-label="Primary">` around the fixed anchors; active anchor gets
  `aria-current="page"` automatically via `NavLink`.
- Nav labels use `sr-only sm:not-sr-only` on narrow viewports — not `hidden`,
  which would remove the accessible name entirely on mobile.
- `.animate-pulse` (used by `LoadingState`'s skeletons) is disabled under
  `prefers-reduced-motion: reduce` in `index.css`.

## Responsiveness

Table-based screens (`EventsPage`, `SessionsPage`) wrap their `<table>` in an
inner `overflow-x-auto` div, separate from the outer card's `overflow-hidden`
(which exists only to clip content to the card's rounded corners). This keeps
narrow-viewport table content reachable by horizontal scroll instead of being
silently clipped.

## Extending the shell

- New fixed anchors: add to `nav-items.ts` only — this should stay rare.
- New screens: add a page directory under `src/pages/<feature>/` and a route
  inside the existing `<AppLayout />` layout route in `App.tsx`. No shell
  changes required.
- New reusable, domain-agnostic UI: `src/components/`. Feature-specific UI
  stays inside that feature's own page directory. Truly cross-app primitives
  (not just cross-page) belong in `packages/ui`, not here.
