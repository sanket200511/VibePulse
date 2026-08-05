import React, { useMemo } from "react";
import type { TourStep } from "./types";
import { usePresentation } from "./PresentationContext";
import { TOUR_STEPS } from "./TourSteps";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function PresentationTooltip({ step, targetRect }: { step: TourStep; targetRect: Rect }) {
  const { stepIndex, next, previous, stop, goTo } = usePresentation();
  const totalSteps = TOUR_STEPS.length;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Calculate tooltip placement
  const style = useMemo(() => {
    const gap = 20;
    const s: React.CSSProperties = {
      position: "absolute",
      pointerEvents: "auto",
    };

    if (step.placement === "center") {
      s.top = "50%";
      s.left = "50%";
      s.transform = "translate(-50%, -50%)";
    } else if (step.placement === "bottom") {
      s.top = `${targetRect.top + targetRect.height + gap}px`;
      s.left = `${targetRect.left + targetRect.width / 2}px`;
      s.transform = "translateX(-50%)";
    } else if (step.placement === "top") {
      s.bottom = `${window.innerHeight - targetRect.top + gap}px`;
      s.left = `${targetRect.left + targetRect.width / 2}px`;
      s.transform = "translateX(-50%)";
    } else if (step.placement === "right") {
      s.top = `${targetRect.top + targetRect.height / 2}px`;
      s.left = `${targetRect.left + targetRect.width + gap}px`;
      s.transform = "translateY(-50%)";
    } else if (step.placement === "left") {
      s.top = `${targetRect.top + targetRect.height / 2}px`;
      s.right = `${window.innerWidth - targetRect.left + gap}px`;
      s.transform = "translateY(-50%)";
    }

    // Boundary constraints (prevent rendering off-screen)
    // For a fully robust solution, floating-ui would be used here.
    return s;
  }, [step.placement, targetRect]);

  return (
    <div
      className="bg-card border-border animate-in fade-in zoom-in-95 w-[400px] rounded-2xl border p-6 shadow-2xl duration-300"
      style={style}
      role="dialog"
      aria-label={step.title}
    >
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-primary-text text-xl font-bold tracking-tight">{step.title}</h3>
        <button
          onClick={stop}
          className="text-muted-foreground hover:text-primary-text p-1 transition-colors"
          aria-label="Exit presentation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-secondary-text mb-6 text-sm leading-relaxed">{step.description}</p>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? "bg-accent-color w-6" : "bg-border hover:bg-muted-foreground w-1.5 cursor-pointer"}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!isFirst && (
            <button
              onClick={previous}
              className="bg-muted-color/50 text-secondary-text hover:text-primary-text hover:bg-muted-color flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </button>
          )}

          <button
            onClick={isLast ? stop : next}
            className="bg-accent-color text-background hover:bg-accent-color/90 flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            {isLast ? "Finish" : "Next"} {!isLast && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
