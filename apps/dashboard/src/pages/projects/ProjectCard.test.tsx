import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProjectCard } from "./ProjectsPage";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("ProjectCard", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
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
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectCard project={mockProject} />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const links = screen.getAllByRole("link");
    const mainCard = links[0]?.closest(".group");
    expect(mainCard?.className).toContain("ring-2");
    expect(mainCard?.className).toContain("ring-accent-color");

    // After 1 second, pulse should clear
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(mainCard?.className).not.toContain("ring-2");
    expect(mainCard?.className).not.toContain("ring-accent-color");

    // New telemetry arrives (updated_at changes)
    rerender(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectCard project={{ ...mockProject, updated_at: "2026-08-02T00:00:00Z" }} />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Pulse should trigger again
    expect(mainCard?.className).toContain("ring-2");
    expect(mainCard?.className).toContain("ring-accent-color");
  });
});
