import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { WorkspaceHomePage } from "./WorkspaceHomePage";
import { setDemoMode } from "../../demo/config";
import { vi } from "vitest";

vi.mock("../../components/presentation", () => ({
  usePresentation: () => ({
    start: vi.fn(),
  }),
}));

describe("WorkspaceHomePage with Demo Mode Enabled", () => {
  beforeEach(() => {
    setDemoMode(true);
  });

  it("renders the demo mode banner and workspace header", () => {
    render(
      <MemoryRouter>
        <WorkspaceHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/VibePulse Engineering Observability Platform/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Workspace: VibeSync/i })).toBeInTheDocument();
    expect(screen.getByText(/Path: d:\/VibeSync/i)).toBeInTheDocument();
  });

  it("renders the primary canvas with demo content", () => {
    render(
      <MemoryRouter>
        <WorkspaceHomePage />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <WorkspaceHomePage />
      </MemoryRouter>,
    );

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

  it("renders the empty placeholders", () => {
    render(
      <MemoryRouter>
        <WorkspaceHomePage />
      </MemoryRouter>,
    );

    expect(
      screen.queryByText(/VibePulse Engineering Observability Platform/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Workspace: Unselected/i })).toBeInTheDocument();

    // Empty state placeholders
    expect(screen.getByText("Story Card")).toBeInTheDocument();
    expect(screen.getAllByText("Current Session").length).toBe(2);
    expect(screen.getAllByText("Timeline Preview").length).toBe(2);
    expect(screen.getAllByText("Projects").length).toBe(2);
  });
});
