# VibePulse UI & Stabilization Report

## 1. Executive Summary

During the Product Stabilization Sprint, the frontend architecture was audited to ensure a commercial-grade, deterministic user experience. A strict zero-warning linting policy was established, layout shifts on edge cases were resolved, and professional viewport-clamped positioning was integrated for floating elements.

## 2. Issues Found & Fixed

### 🔴 Critical Issues Fixed

- **Tooltip Viewport Escape (Layout Shift)**
  - _Issue_: The Presentation Mode tooltip calculated position using manual math relative to the viewport, which could cause overflows, clipping, or unintended horizontal scrolling when targets were near the edge of the screen.
  - _Fix_: Replaced the manual positioning with `@floating-ui/react-dom`. Created a Virtual Element bound to the `targetRect`, applying `flip()`, `shift()`, and `offset()` middleware. Floating elements now dynamically recalculate on resize/scroll via `autoUpdate`, ensuring they never leave the visible viewport.

### 🟡 Major Issues Fixed

- **Mobile/Responsive Horizontal Scrolling**
  - _Issue_: Custom scrollbars or 100vw calculations caused arbitrary horizontal layout shifts on Windows systems.
  - _Fix_: Applied `overflow-x: hidden` to the global `body` tag in `index.css`, enforcing strict vertical scrolling only.
- **Port Conflict (EACCES)**
  - _Issue_: The Vite server defaulted to `5173`, which falls inside a reserved port exclusion range (`5125-5224`) common on Windows with Hyper-V.
  - _Fix_: Standardized the Vite dashboard to run safely on `localhost:3000` to prevent `EACCES` startup crashes for new developers.

### 🟢 Minor & DX Issues Fixed

- **TypeScript `any` Poisoning**
  - _Issue_: The canonical event mappers (`mappers.ts`) used `any` types to bypass hook circular dependencies, reducing TypeScript's effectiveness.
  - _Fix_: Imported the explicit interfaces (`InvestigationResult`, `AIInteractionTimelineEntry`, `ArchitectureTimelineEntry`) from their respective hooks, eliminating 15 linting warnings.
- **React Hook Exhaustive-Deps**
  - _Issue_: `queryKey` arrays in `useInvestigation.ts` and `useAIProvenance.ts` were unmemoized inline arrays passed to `useEffect`, causing unnecessary effect triggers and layout thrashing on re-renders.
  - _Fix_: Wrapped all `queryKey` arrays in `useMemo` blocks and added the missing `queryStr` dependency to the Investigation WebSocket effect.

## 3. Files Modified

- `apps/dashboard/src/components/presentation/PresentationTooltip.tsx` (Rebuilt with Floating UI)
- `apps/dashboard/src/index.css` (Body overflow constraints)
- `apps/dashboard/src/lib/events/mappers.ts` (Strict typing)
- `apps/dashboard/src/pages/investigation/useInvestigation.ts` (Dependency memoization)
- `apps/dashboard/src/pages/projects/useAIProvenance.ts` (Dependency memoization)
- `apps/dashboard/vite.config.ts` (Port stabilization)
- `INSTALLATION.md` (Updated docs to reflect new stable port)

## 4. Remaining Known Limitations

- **Presentation Mode on Mobile**: The Replay player scales down, but reading specific code diffs on a phone screen remains challenging.
- **Large AST Payloads**: Opening an `EvolutionDiff` for a file over 5,000 lines can cause brief UI stuttering due to the syntax highlighter rendering synchronously.

## 5. Screens Requiring Manual QA

- **`/sessions/:sessionId/presentation`**: Verify that resizing the browser window causes the tooltip to smoothly jump (flip) above/below the target element without causing scrollbars.
- **`/investigate`**: Verify that typing rapidly does not cause the WebSocket connection to thrash (now that the exhaustive-deps bug is resolved).

## 6. Potential Future Improvements

- **Virtualization**: Implement `@tanstack/react-virtual` for the Architecture Timeline view to maintain 60fps scrolling when a session contains more than 2,000 structural events.
- **Command Palette**: Introduce a global `cmd+k` / `ctrl+k` overlay to jump straight to the Investigation Engine from anywhere in the app.
