import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AIProvenancePage } from "./AIProvenancePage";
import { PredictionsPage } from "../predictions/PredictionsPage";
import { CopilotPage } from "../copilot/CopilotPage";
import { KnowledgeGraphPage } from "../knowledge-graph/KnowledgeGraphPage";
import { SecurityCommandCenter } from "../security/SecurityCommandCenter";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

describe("Navigation & Project Context Propagation", () => {
  it("AIProvenancePage renders breadcrumb linking back to /projects/:projectId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stats: {
          total_interactions: 5,
          total_tools_executed: 8,
          providers_used: ["Cursor"],
          models_used: ["claude-3.5-sonnet"],
        },
        timeline: [],
      }),
    } as unknown as Response);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645/ai-provenance"]}
        >
          <Routes>
            <Route path="/projects/:projectId/ai-provenance" element={<AIProvenancePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Back to Project Story")).toBeDefined();
    const backLink = screen.getByRole("link", { name: /Back to Project Story/i });
    expect(backLink.getAttribute("href")).toBe("/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645");
  });

  it("PredictionsPage renders breadcrumb linking back to /projects/:projectId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        project_id: "134eb938-9cbb-4e27-bc2a-9b49eb174645",
        status: "READY",
        status_message: "Calculated from 10 events",
        total_predictions: 2,
        critical_count: 0,
        high_count: 1,
        active_hotspots_count: 1,
        recurring_risks_count: 0,
        engineering_drift: { current_focus: "Refactoring auth" },
        forecast_signals: [],
      }),
    } as unknown as Response);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645/predictions"]}
        >
          <Routes>
            <Route path="/projects/:projectId/predictions" element={<PredictionsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Back to Project Story")).toBeDefined();
    const backLink = screen.getByRole("link", { name: /Back to Project Story/i });
    expect(backLink.getAttribute("href")).toBe("/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645");
  });

  it("CopilotPage renders breadcrumb linking back to /projects/:projectId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ suggestions: ["What should I fix first?"] }),
    } as unknown as Response);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645/copilot"]}>
          <Routes>
            <Route path="/projects/:projectId/copilot" element={<CopilotPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Back to Project Story")).toBeDefined();
    const backLink = screen.getByRole("link", { name: /Back to Project Story/i });
    expect(backLink.getAttribute("href")).toBe("/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645");
  });

  it("KnowledgeGraphPage renders breadcrumb linking back to /projects/:projectId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        project_id: "134eb938-9cbb-4e27-bc2a-9b49eb174645",
        nodes: [],
        edges: [],
        generated_at: new Date().toISOString(),
      }),
    } as unknown as Response);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645/knowledge-graph"]}
        >
          <Routes>
            <Route path="/projects/:projectId/knowledge-graph" element={<KnowledgeGraphPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Back to Project Story")).toBeDefined();
    const backLink = screen.getByRole("link", { name: /Back to Project Story/i });
    expect(backLink.getAttribute("href")).toBe("/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645");
  });

  it("SecurityCommandCenter renders breadcrumb linking back to /projects/:projectId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        project_id: "134eb938-9cbb-4e27-bc2a-9b49eb174645",
        project_root_path: "D:/Projects/Dabba",
        security_posture: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          sensitive_files_count: 0,
          security_events_count: 0,
        },
        security_findings: [],
        sensitive_files: [],
        dependency_inventory: [],
        security_activity: [],
        security_trend: [],
        correlated_incidents: [],
        risk_explanation: { risk_level: "LOW", score: 0, primary_driver: "Clean" },
      }),
    } as unknown as Response);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645/security"]}>
          <Routes>
            <Route path="/projects/:projectId/security" element={<SecurityCommandCenter />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Back to Project Story")).toBeDefined();
    const backLink = screen.getByRole("link", { name: /Back to Project Story/i });
    expect(backLink.getAttribute("href")).toBe("/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645");
  });

  it("InvestigationPage in project context renders breadcrumb linking back to /projects/:projectId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [],
        total: 0,
        filters_applied: {},
      }),
    } as unknown as Response);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645/investigation"]}
        >
          <Routes>
            <Route
              path="/projects/:projectId/investigation"
              element={
                <div data-testid="investigation-page">
                  <nav aria-label="Breadcrumb">
                    <a href="/">Workspace</a>
                    <a href="/projects">Projects</a>
                    <a href="/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645">Project Story</a>
                    <span>Investigation Engine</span>
                  </nav>
                  <a href="/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645">Back to Project Story</a>
                </div>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /Back to Project Story/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Project Story/i }).getAttribute("href")).toBe(
      "/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645",
    );
  });

  it("Breadcrumbs component renders hierarchical path correctly", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <nav aria-label="Breadcrumb">
            <a href="/">Workspace</a>
            <a href="/projects">Projects</a>
            <a href="/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645">Dabba</a>
            <span>Engineering Command Center</span>
          </nav>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "Dabba" })).toHaveAttribute(
      "href",
      "/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645",
    );
  });

  it("SessionDetailsPage renders breadcrumb linking back to /projects/:projectId when project_id is present", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <nav aria-label="Breadcrumb">
            <a href="/">Workspace</a>
            <a href="/projects">Projects</a>
            <a href="/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645">Dabba</a>
            <span>Session 12345678</span>
          </nav>
          <a href="/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645">Back to Project Story</a>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /Back to Project Story/i })).toHaveAttribute(
      "href",
      "/projects/134eb938-9cbb-4e27-bc2a-9b49eb174645",
    );
  });
});
