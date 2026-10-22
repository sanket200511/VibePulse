import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectDetailsPage } from "./ProjectDetailsPage";
import { setDemoMode } from "../../demo/config";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithRouter(initialRoute: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectDetailsPage (Demo Mode)", () => {
  beforeEach(() => {
    setDemoMode(true);
  });

  it("renders the project identity and sessions for an existing project", () => {
    renderWithRouter("/projects/project_vibesync_001");

    // Identity region
    expect(screen.getByRole("heading", { name: "VibePulse" })).toBeInTheDocument();
    expect(screen.getAllByText("d:/VibeSync").length).toBeGreaterThan(0);

    // Session region
    expect(screen.getByRole("heading", { name: "Session History" })).toBeInTheDocument();
  });

  it("renders a not found error state for an unknown project ID", () => {
    renderWithRouter("/projects/non_existent_project");

    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });
});
