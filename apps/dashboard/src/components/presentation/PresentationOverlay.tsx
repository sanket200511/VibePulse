import { useEffect, useState, useRef } from "react";
import type { TourStep } from "./types";
import { PresentationTooltip } from "./PresentationTooltip";
import { usePresentation } from "./PresentationContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function PresentationOverlay({ step }: { step: TourStep }) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isReady, setIsReady] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const { state, targetFound, reportError, stop } = usePresentation();

  useEffect(() => {
    let rafId: number;
    const startTime = Date.now();
    const MAX_WAIT_MS = 3000;

    const checkElement = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        // Setup ResizeObserver to track size changes
        if (!observerRef.current) {
          observerRef.current = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            setTargetRect({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            });
          });
        }
        observerRef.current.observe(el);

        // Also run on scroll
        const updateRect = () => {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        };

        updateRect();

        // Only scroll into view if it's very out of bounds
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

        window.addEventListener("scroll", updateRect, { passive: true });

        // Wait a tiny bit for scrolling to settle before showing tooltip
        setTimeout(() => {
          setIsReady(true);
          targetFound();
        }, 300);

        return () => {
          window.removeEventListener("scroll", updateRect);
          if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
          }
        };
      } else {
        if (Date.now() - startTime > MAX_WAIT_MS) {
          reportError(new Error(`Timeout waiting for target element: ${step.target}`));
          stop(); // gracefully exit
          return undefined;
        }
        // Keep polling until the route mounts the component or we timeout
        rafId = requestAnimationFrame(checkElement);
      }
      return undefined;
    };

    const cleanup = checkElement();

    return () => {
      cancelAnimationFrame(rafId);
      if (typeof cleanup === "function") cleanup();
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [step.target, targetFound, reportError, stop]);

  // If we haven't found the target yet, we just show a dark screen
  if (!targetRect) {
    return (
      <div className="bg-background/80 fixed inset-0 z-[9999] backdrop-blur-sm transition-opacity duration-500" />
    );
  }

  // Spotlight padding
  const p = 12;
  const holeTop = targetRect.top - p;
  const holeLeft = targetRect.left - p;
  const holeWidth = targetRect.width + p * 2;
  const holeHeight = targetRect.height + p * 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Spotlight Window */}
      <div
        className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-500 ease-in-out motion-reduce:transition-none"
        style={{
          top: `${holeTop}px`,
          left: `${holeLeft}px`,
          width: `${holeWidth}px`,
          height: `${holeHeight}px`,
          pointerEvents: "none",
        }}
      />

      {/* Invisible overlay to block clicks on the rest of the app */}
      <div className="pointer-events-auto absolute inset-0 cursor-default" />

      {/* Tooltip positioned relative to target */}
      {isReady && state === "SHOWING_TOOLTIP" && (
        <PresentationTooltip
          step={step}
          targetRect={{ top: holeTop, left: holeLeft, width: holeWidth, height: holeHeight }}
        />
      )}
    </div>
  );
}
