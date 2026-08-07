import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProjectCard } from "./ProjectsPage";
import { BrowserRouter } from "react-router-dom";

describe("ProjectCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const mockProject = {
    id: "proj-1",
    display_name: "Test Project",
    root_path: "/test",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  };

  it("pulses when updated_at changes", () => {
    const { rerender } = render(
      <BrowserRouter>
        <ProjectCard project={mockProject} />
      </BrowserRouter>,
    );

    const card = screen.getByRole("link");
    expect(card.className).toContain("ring-2");
    expect(card.className).toContain("ring-accent-color");

    // After 1 second, pulse should clear
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(card.className).not.toContain("ring-2");
    expect(card.className).not.toContain("ring-accent-color");

    // New telemetry arrives (updated_at changes)
    rerender(
      <BrowserRouter>
        <ProjectCard project={{ ...mockProject, updated_at: "2026-08-02T00:00:00Z" }} />
      </BrowserRouter>,
    );

    // Pulse should trigger again
    expect(card.className).toContain("ring-2");
    expect(card.className).toContain("ring-accent-color");
  });
});
