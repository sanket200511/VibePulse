import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PresentationContext } from "./PresentationContext";
import { TOUR_STEPS } from "./TourSteps";
import type { PresentationState } from "./types";
import { PresentationOverlay } from "./PresentationOverlay";

export function PresentationEngine({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();

  const currentStep =
    running && stepIndex >= 0 && stepIndex < TOUR_STEPS.length
      ? (TOUR_STEPS[stepIndex] ?? null)
      : null;

  const navigateToStep = useCallback(
    (index: number) => {
      const step = TOUR_STEPS[index];
      if (!step) return;

      // Resolve route and navigate
      const route = step.routeResolver({
        ...(projectId ? { projectId } : {}),
        ...(sessionId ? { sessionId } : {}),
      });
      void navigate(route);
    },
    [navigate, projectId, sessionId],
  );

  const start = useCallback(
    (options?: { projectId?: string; sessionId?: string }) => {
      setProjectId(options?.projectId || "demo-project");
      setSessionId(options?.sessionId || "session-demo");
      setRunning(true);
      setStepIndex(0);
      navigateToStep(0);
    },
    [navigateToStep],
  );

  const stop = useCallback(() => {
    setRunning(false);
    setStepIndex(-1);
  }, []);

  const next = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      navigateToStep(nextIndex);
    } else {
      stop();
    }
  }, [stepIndex, navigateToStep, stop]);

  const previous = useCallback(() => {
    if (stepIndex > 0) {
      const prevIndex = stepIndex - 1;
      setStepIndex(prevIndex);
      navigateToStep(prevIndex);
    }
  }, [stepIndex, navigateToStep]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < TOUR_STEPS.length) {
        setStepIndex(index);
        navigateToStep(index);
      }
    },
    [navigateToStep],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!running) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        previous();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [running, next, previous, stop]);

  const value: PresentationState = {
    running,
    stepIndex,
    currentStep,
    projectId,
    sessionId,
    next,
    previous,
    start,
    stop,
    goTo,
  };

  return (
    <PresentationContext.Provider value={value}>
      {children}
      {running && currentStep && <PresentationOverlay step={currentStep} />}
    </PresentationContext.Provider>
  );
}
