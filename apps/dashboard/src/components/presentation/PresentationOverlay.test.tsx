import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { PresentationOverlay } from "./PresentationOverlay";

// Mock out the context to provide dummy methods since PresentationTooltip depends on it
vi.mock("./PresentationContext", () => ({
  usePresentation: () => ({
    state: "SHOWING_TOOLTIP",
    stepIndex: 0,
    next: vi.fn(),
    previous: vi.fn(),
    stop: vi.fn(),
    goTo: vi.fn(),
    targetFound: vi.fn(),
    reportError: vi.fn(),
    config: {
      animationDuration: 300,
    },
  }),
}));

describe("PresentationOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Mock requestAnimationFrame to avoid infinite loops in tests
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return setTimeout(() => cb(0), 16) as unknown as number;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders overlay layer even if target is missing", () => {
    const step = {
      id: "test",
      title: "Test",
      description: "Test description",
      routeResolver: () => "/",
      target: "missing-target",
      placement: "bottom" as const,
    };

    const { container } = render(<PresentationOverlay step={step} />);
    expect(container.querySelector(".bg-background\\/80")).toBeTruthy();

    // Advance timers so it doesn't hang
    act(() => {
      vi.advanceTimersByTime(3100);
    });
  });

  it("renders tooltip and spotlight when target is found", () => {
    const step = {
      id: "test",
      title: "Test",
      description: "Test description",
      routeResolver: () => "/",
      target: "existing-target",
      placement: "bottom" as const,
    };

    // Create dummy element in the DOM
    const div = document.createElement("div");
    div.setAttribute("data-tour", "existing-target");
    document.body.appendChild(div);

    const { container } = render(<PresentationOverlay step={step} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // It should render the spotlight window
    expect(container.querySelector(".rounded-2xl")).toBeTruthy();

    // Cleanup
    document.body.removeChild(div);
  });
});
