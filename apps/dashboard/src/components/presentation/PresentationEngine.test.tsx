import { describe, it, expect, vi, beforeEach } from "vitest";
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
  };
});

describe("PresentationEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <PresentationEngine>{children}</PresentationEngine>
    </MemoryRouter>
  );

  it("starts in idle state", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });
    expect(result.current.running).toBe(false);
    expect(result.current.stepIndex).toBe(-1);
    expect(result.current.currentStep).toBeNull();
  });

  it("can start and stop presentation", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.currentStep?.id).toBe("welcome");
    expect(mockNavigate).toHaveBeenCalledWith("/");

    act(() => {
      result.current.stop();
    });

    expect(result.current.running).toBe(false);
    expect(result.current.stepIndex).toBe(-1);
  });

  it("can navigate to next and previous steps", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    expect(result.current.stepIndex).toBe(0);

    act(() => {
      result.current.next();
    });

    expect(result.current.stepIndex).toBe(1);

    act(() => {
      result.current.previous();
    });

    expect(result.current.stepIndex).toBe(0);
  });

  it("can jump to a specific step", () => {
    const { result } = renderHook(() => usePresentation(), { wrapper });

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.goTo(5);
    });

    expect(result.current.stepIndex).toBe(5);
    expect(result.current.currentStep?.id).toBe("architecture-timeline");
  });
});
