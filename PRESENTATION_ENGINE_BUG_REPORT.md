# Presentation Engine Bug Report

## 1. Root Cause

The "frozen application" bug is caused by two compounding defects within the Presentation Engine:

**A. Unclickable Tooltip (Pointer Events Regression)**
When `PresentationTooltip.tsx` was refactored to use `@floating-ui/react-dom`, the inline `pointerEvents: "auto"` style was accidentally removed. The tooltip is rendered inside a parent container (`PresentationOverlay.tsx`) which explicitly enforces `pointer-events-none` on the entire screen wrapper, while placing a `pointer-events-auto` invisible overlay behind the tooltip to trap clicks. Because the tooltip itself no longer overrides the pointer events, it inherits `pointer-events: none`. Thus, the "Next", "Back", and "Close" buttons are unclickable, leaving the user trapped on Step 0.

**B. Missing Target Elements (Infinite Wait Loop)**
Even if the user bypasses the first issue using keyboard navigation (e.g., pressing the Right Arrow key), the app will fatally freeze at Step 6 (`ai-provenance`) and Step 10 (`investigation`). A repository audit confirms that `data-tour="ai-provenance"` and `data-tour="investigation"` are completely missing from the application.
When `PresentationOverlay` fails to find a target element, it enters an infinite `requestAnimationFrame` polling loop waiting for the element to mount. While polling, it renders a loading backdrop: `<div className="bg-background/80 fixed inset-0 z-[9999] ...">`. This backdrop lacks `pointer-events-none`, so it intercepts all mouse clicks across the entire screen. Because the element never mounts, this blocking overlay remains permanently, fully freezing the application.

## 2. Reproduction Steps

1. Open the VibePulse dashboard.
2. Ensure Demo Mode is active.
3. Click "Start Guided Demo" in the welcome banner.
4. **Result A**: The tooltip appears for Step 0, but the "Next" and "Close" buttons cannot be clicked. The mouse cursor clicks "through" them, hitting the invisible click-trap layer instead.
5. Press the Right Arrow key 6 times to advance to the `ai-provenance` step.
6. **Result B**: The screen darkens with the `bg-background/80` backdrop. The tooltip never appears. The app is completely deadlocked and requires a hard refresh.

## 3. Stack Trace

There is no runtime stack trace or console error because both issues are logical CSS/layout deadlocks rather than JavaScript runtime exceptions. The `requestAnimationFrame` loop in `PresentationOverlay.tsx` silently spins forever in the background without throwing.

## 4. Affected Files

- `apps/dashboard/src/components/presentation/PresentationTooltip.tsx` (Missing pointer-events override)
- `apps/dashboard/src/components/presentation/PresentationOverlay.tsx` (Unsafe infinite fallback loop without a timeout)
- `apps/dashboard/src/pages/projects/AIProvenancePage.tsx` or equivalent (Missing `data-tour="ai-provenance"`)
- `apps/dashboard/src/pages/investigation/InvestigationPage.tsx` or equivalent (Missing `data-tour="investigation"`)

## 5. Recommended Fix

1. **Fix the Tooltip Clicks**: Add `pointer-events-auto` to the `className` string in `PresentationTooltip.tsx` to restore interactivity.
2. **Add Polling Timeout**: Modify the `requestAnimationFrame` polling in `PresentationOverlay.tsx` to time out after ~3000ms. If the target is not found, gracefully exit the presentation to prevent a permanent freeze.
3. **Add Missing Targets**: Inject `data-tour="ai-provenance"` and `data-tour="investigation"` into their respective page components.

## 6. Regression Risks

- **Low Risk**: Adding `pointer-events-auto` only affects the tooltip element itself.
- **Low Risk**: Adding a timeout to the polling loop is a standard safety measure that prevents infinite deadlocks.
- **Low Risk**: Adding data attributes to DOM nodes has no side effects on existing application logic.
