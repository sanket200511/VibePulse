import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PresentationEngine } from "./PresentationEngine";
import { usePresentation } from "./PresentationContext";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as Record<string, unknown>),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/" }),
  };
});

describe("PresentationEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <PresentationEngine>{children}</PresentationEngine>
    </MemoryRouter>
  );

  it("starts in idle state", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });
    expect(result.current.running).toBe(false);
    expect(result.current.state).toBe("IDLE");
    expect(result.current.stepIndex).toBe(-1);
    expect(result.current.currentStep).toBeNull();
  });

  it("can start and stop presentation", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);
    expect(result.current.state).toBe("TRANSITIONING");
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.currentStep?.id).toBe("welcome");
    expect(mockNavigate).toHaveBeenCalledWith("/");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state).toBe("WAITING_FOR_TARGET");

    act(() => {
      result.current.stop();
    });

    expect(result.current.running).toBe(false);
    expect(result.current.state).toBe("CANCELLED");
    expect(result.current.stepIndex).toBe(-1);
  });

  it("can navigate to next and previous steps", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.stepIndex).toBe(0);

    act(() => {
      result.current.next();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.stepIndex).toBe(1);

    act(() => {
      result.current.previous();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.stepIndex).toBe(0);
  });

  it("can jump to a specific step", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.goTo(5);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.stepIndex).toBe(5);
    expect(result.current.currentStep?.id).toBe("architecture-timeline");
  });

  it("transitions to SHOWING_TOOLTIP when targetFound is called", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state).toBe("WAITING_FOR_TARGET");

    act(() => {
      result.current.targetFound();
    });

    expect(result.current.state).toBe("SHOWING_TOOLTIP");
  });

  it("transitions to ERROR when reportError is called", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.reportError(new Error("Test Error"));
    });

    expect(result.current.state).toBe("ERROR");
    expect(result.current.running).toBe(false);
  });
});
