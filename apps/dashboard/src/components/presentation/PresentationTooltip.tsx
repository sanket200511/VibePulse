import React, { useMemo } from "react";
import type { TourStep } from "./types";
import { usePresentation } from "./PresentationContext";
import { TOUR_STEPS } from "./TourSteps";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { useFloating, shift, flip, offset, autoUpdate } from "@floating-ui/react-dom";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function PresentationTooltip({ step, targetRect }: { step: TourStep; targetRect: Rect }) {
  const { state, stepIndex, next, previous, stop, goTo } = usePresentation();
  const totalSteps = TOUR_STEPS.length;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Virtual element for Floating UI based on targetRect
  const virtualElement = useMemo(() => {
    return {
      getBoundingClientRect: () => ({
        x: targetRect.left,
        y: targetRect.top,
        top: targetRect.top,
        left: targetRect.left,
        bottom: targetRect.top + targetRect.height,
        right: targetRect.left + targetRect.width,
        width: targetRect.width,
        height: targetRect.height,
      }),
    };
  }, [targetRect]);

  const { refs, floatingStyles } = useFloating({
    placement: step.placement === "center" ? "bottom" : step.placement, // Center unsupported natively, use offset
    elements: {
      reference: virtualElement,
    },
    middleware: [offset(20), flip(), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate,
  });

  const tooltipRef = React.useRef<HTMLDivElement>(null);

  // Focus trap and keyboard accessibility
  React.useEffect(() => {
    if (state !== "SHOWING_TOOLTIP") return;

    // Focus the tooltip when it appears
    const el = tooltipRef.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    // Auto focus the "Next" button if possible, otherwise first element
    const nextButton = Array.from(focusable).find(
      (f) => f.textContent?.includes("Next") || f.textContent?.includes("Finish"),
    );
    if (nextButton) {
      nextButton.focus();
    } else if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable?.focus();
            e.preventDefault();
          }
        }
      }
    };

    el.addEventListener("keydown", handleTab);
    return () => el.removeEventListener("keydown", handleTab);
  }, [state]);

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        // @ts-expect-error - assignment to ref
        tooltipRef.current = node;
      }}
      className="bg-card border-border animate-in fade-in zoom-in-95 pointer-events-auto z-50 w-[400px] rounded-2xl border p-6 shadow-2xl duration-300"
      style={{
        ...floatingStyles,
        ...(step.placement === "center" && {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          position: "fixed",
        }),
      }}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-primary-text text-xl font-bold tracking-tight">{step.title}</h3>
        <button
          onClick={stop}
          className="text-muted-foreground hover:text-primary-text focus:ring-accent-color rounded p-1 transition-colors focus:outline-none focus:ring-2"
          aria-label="Exit presentation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-secondary-text mb-6 text-sm leading-relaxed">{step.description}</p>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              className={`focus:ring-accent-color h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 ${i === stepIndex ? "bg-accent-color w-6" : "bg-border hover:bg-muted-foreground w-1.5 cursor-pointer"}`}
              onClick={() => goTo(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!isLast && (
            <button
              onClick={stop}
              className="text-secondary-text hover:text-primary-text focus:ring-accent-color flex items-center justify-center gap-1 rounded-lg bg-transparent px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2"
            >
              Skip
            </button>
          )}

          {!isFirst && (
            <button
              onClick={previous}
              className="bg-muted-color/50 text-secondary-text hover:text-primary-text hover:bg-muted-color focus:ring-accent-color flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2"
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </button>
          )}

          <button
            onClick={isLast ? stop : next}
            className="bg-accent-color text-background hover:bg-accent-color/90 focus:ring-accent-color flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors focus:outline-none focus:ring-2"
          >
            {isLast ? "Finish" : "Next"} {!isLast && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
