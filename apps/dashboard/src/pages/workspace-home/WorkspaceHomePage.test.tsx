import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceHomePage } from "./WorkspaceHomePage";
import { setDemoMode } from "../../demo/config";
import { vi } from "vitest";

vi.mock("../../components/presentation", () => ({
  usePresentation: () => ({
    start: vi.fn(),
  }),
}));

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkspaceHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WorkspaceHomePage with Demo Mode Enabled", () => {
  beforeEach(() => {
    setDemoMode(true);
  });

  it("renders the demo mode banner and workspace header", () => {
    renderHomePage();

    expect(screen.getByText(/VibePulse Engineering Observability Platform/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Workspace: VibeSync/i })).toBeInTheDocument();
    expect(screen.getByText(/Path: d:\/VibeSync/i)).toBeInTheDocument();
  });

  it("renders the primary canvas with demo content", () => {
    renderHomePage();

    // Section headings
    expect(screen.getByRole("heading", { name: "Today's Story" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Session" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Timeline Preview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();

    // Specific demo text from mock data
    expect(screen.getByText("Refactoring the filesystem observation pipeline")).toBeInTheDocument();
    expect(screen.getByText(/Today you spent most of your time/i)).toBeInTheDocument();
    expect(screen.getByText("Active Session in VibePulse")).toBeInTheDocument();
    expect(screen.getByText("Started Observation")).toBeInTheDocument();
    expect(screen.getByText("VibePulse daemon attached to workspace root")).toBeInTheDocument();
    expect(screen.getByText("AquaPulse")).toBeInTheDocument();
  });

  it("renders the secondary rail with demo content", () => {
    renderHomePage();

    // Section headings
    expect(screen.getByRole("heading", { name: "Observation Status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Focus" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today's Reflection" })).toBeInTheDocument();

    // Specific demo text
    expect(screen.getByText("Telemetry Daemon")).toBeInTheDocument();
    expect(screen.getByText("Active Focus Rhythm")).toBeInTheDocument();
    expect(screen.getByText("Architectural Focus")).toBeInTheDocument();
    expect(screen.getByText(/You spent significantly more time/i)).toBeInTheDocument();
  });
});

describe("WorkspaceHomePage with Demo Mode Disabled", () => {
  beforeEach(() => {
    setDemoMode(false);
  });

  it("renders the live workspace view when not in demo mode", () => {
    renderHomePage();

    expect(
      screen.queryByText(/VibePulse Engineering Observability Platform/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "VibePulse" })).toBeInTheDocument();

    // Live state sections
    expect(screen.getAllByText("Observation Status").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Awaiting Daemon")).toBeInTheDocument();
    expect(screen.getByText("Quick Links")).toBeInTheDocument();
  });
});
