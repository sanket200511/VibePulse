import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PresentationContext } from "./PresentationContext";
import { TOUR_STEPS } from "./TourSteps";
import type { PresentationState, EngineState } from "./types";
import { PresentationOverlay } from "./PresentationOverlay";

export function PresentationEngine({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<EngineState>("IDLE");
  const [stepIndex, setStepIndex] = useState(-1);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const isTransitioningRef = useRef(false);

  const running =
    state !== "IDLE" && state !== "COMPLETED" && state !== "CANCELLED" && state !== "ERROR";

  const currentStep =
    running && stepIndex >= 0 && stepIndex < TOUR_STEPS.length
      ? (TOUR_STEPS[stepIndex] ?? null)
      : null;

  const navigateToStep = useCallback(
    (index: number) => {
      const step = TOUR_STEPS[index];
      if (!step) {
        setState("ERROR");
        return;
      }

      setState("TRANSITIONING");
      isTransitioningRef.current = true;

      const route = step.routeResolver({
        ...(projectId ? { projectId } : {}),
        ...(sessionId ? { sessionId } : {}),
      });

      void navigate(route);

      // We rely on an effect listening to `location` to know when transition is done,
      // or we can just immediately move to WAITING_FOR_TARGET. React Router navigation is sync-ish.
      setTimeout(() => {
        setState("WAITING_FOR_TARGET");
        isTransitioningRef.current = false;
      }, 50);
    },
    [navigate, projectId, sessionId],
  );

  const start = useCallback(
    (options?: { projectId?: string; sessionId?: string }) => {
      if (state !== "IDLE" && state !== "COMPLETED" && state !== "CANCELLED" && state !== "ERROR") {
        return; // Already running
      }
      setProjectId(options?.projectId || "demo-project");
      setSessionId(options?.sessionId || "session-demo");
      setState("STARTING");
      setStepIndex(0);
      navigateToStep(0);
    },
    [state, navigateToStep],
  );

  const stop = useCallback(() => {
    setState("CANCELLED");
    setStepIndex(-1);
  }, []);

  const next = useCallback(() => {
    if (state === "TRANSITIONING" || isTransitioningRef.current) return;
    if (stepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      navigateToStep(nextIndex);
    } else {
      setState("COMPLETED");
      setStepIndex(-1);
    }
  }, [state, stepIndex, navigateToStep]);

  const previous = useCallback(() => {
    if (state === "TRANSITIONING" || isTransitioningRef.current) return;
    if (stepIndex > 0) {
      const prevIndex = stepIndex - 1;
      setStepIndex(prevIndex);
      navigateToStep(prevIndex);
    }
  }, [state, stepIndex, navigateToStep]);

  const goTo = useCallback(
    (index: number) => {
      if (state === "TRANSITIONING" || isTransitioningRef.current) return;
      if (index >= 0 && index < TOUR_STEPS.length) {
        setStepIndex(index);
        navigateToStep(index);
      }
    },
    [state, navigateToStep],
  );

  const reportError = useCallback((error: Error) => {
    console.error("PresentationEngine Error:", error);
    setState("ERROR");
    setStepIndex(-1);
  }, []);

  const targetFound = useCallback(() => {
    if (state === "WAITING_FOR_TARGET") {
      setState("SHOWING_TOOLTIP");
    }
  }, [state]);

  // Keyboard navigation
  useEffect(() => {
    if (!running) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        if (state === "SHOWING_TOOLTIP") {
          e.preventDefault();
          next();
        }
      } else if (e.key === "ArrowLeft") {
        if (state === "SHOWING_TOOLTIP") {
          e.preventDefault();
          previous();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [running, state, next, previous, stop]);

  const value: PresentationState = {
    state,
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
    reportError,
    targetFound,
  };

  return (
    <PresentationContext.Provider value={value}>
      {children}
      {running && currentStep && <PresentationOverlay step={currentStep} />}
    </PresentationContext.Provider>
  );
}
