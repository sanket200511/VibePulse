import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { PresentationOverlay } from "./PresentationOverlay";

// Mock out the context to provide dummy methods since PresentationTooltip depends on it
vi.mock("./PresentationContext", () => ({
  usePresentation: () => ({
    stepIndex: 0,
    next: vi.fn(),
    previous: vi.fn(),
    stop: vi.fn(),
    goTo: vi.fn(),
  }),
}));

describe("PresentationOverlay", () => {
  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
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

    // It should render the spotlight window
    expect(container.querySelector(".rounded-2xl")).toBeTruthy();

    // Cleanup
    document.body.removeChild(div);
  });
});
