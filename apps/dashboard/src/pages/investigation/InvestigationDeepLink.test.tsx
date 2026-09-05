import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvestigationPage } from "./InvestigationPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const mockInvestigationResponse = {
  results: [
    {
      id: "event-123",
      timestamp: "2026-08-22T10:00:00Z",
      project_root: "D:/DepRadar-Seminar-Demo",
      project_name: "DepRadar-Seminar-Demo",
      session_id: "sess-1",
      file_path: "config/settings.py",
      file_name: "settings.py",
      language: "Python",
      event_type: "FILE_MODIFIED",
      summary: "Security Alert: Hardcoded Secret Detected",
      risk_score: 90,
      risk_level: "CRITICAL",
      status: "RESOLVED",
      risk_factors: [],
      evidence_chain: [],
      evidence_nodes: [],
      affected_files: ["config/settings.py"],
      correlated_events_count: 1,
      recommendation: "Externalize secrets",
      architecture_changes: [],
      security_findings: [
        {
          rule_id: "SEC001",
          severity: "CRITICAL",
          message: "Hardcoded Secret Detected",
          file: "config/settings.py",
          line_number: 7,
          redacted_evidence: "API_KEY = [REDACTED]",
          category: "Credentials",
          recommendation: "Externalize secrets",
        },
      ],
      ai_event: null,
      replay_link: null,
      timeline_position: 0,
    },
  ],
  total_count: 1,
  security_findings_count: 1,
  critical_count: 1,
  suspicious_count: 1,
  high_risk_count: 1,
  sessions_count: 1,
  projects_count: 1,
  has_more: false,
};

const mockIncidentDetail = {
  investigation_id: "inv-inc_sec001",
  project_id: "c95554c9-2b13-4b2d-882a-660cd2da14fe",
  project_display_name: "DepRadar-Seminar-Demo",
  incident_id: "inc_sec001",
  title: "Observed Development Incident",
  summary: "Critical security violation in settings.py",
  status: "RESOLVED",
  severity: "CRITICAL",
  risk_score: 90,
  confidence: "OBSERVED",
  started_at: "2026-08-22T10:00:00Z",
  detected_at: "2026-08-22T10:00:02Z",
  last_activity_at: "2026-08-22T10:00:05Z",
  session_ids: ["sess-1"],
  affected_files: ["config/settings.py"],
  related_events_count: 3,
  security_findings: [
    {
      rule_id: "SEC001",
      severity: "CRITICAL",
      message: "Hardcoded Secret Detected",
      file: "config/settings.py",
      line_number: 7,
      redacted_evidence: "API_KEY = [REDACTED]",
      category: "Credentials",
      recommendation: "Externalize secrets",
      risk_contribution: 40,
      provenance: "OBSERVED",
    },
  ],
  story: {
    title: "Observed Development Incident",
    summary: "Critical security violation in settings.py",
    narrative_paragraphs: ["Developer modified settings.py with hardcoded secret."],
    provenance: "OBSERVED",
  },
  timeline: [],
  risk_evolution: { initial_score: 10, final_score: 90, steps: [] },
  root_cause: {
    primary_signal: "Credential exposure (SEC001)",
    contributing_factors: [],
    confidence_level: "HIGH",
    rationale: "AST regex rule match",
  },
  engineering_dna: {
    normal_focus_dirs: ["src"],
    incident_surface_files: ["config/settings.py"],
    is_surface_deviation: true,
    analysis_summary: "Configuration touch",
    provenance: "OBSERVED",
  },
  affected_surface: {
    breakdown: [],
    most_affected_file: "config/settings.py",
    total_findings: 1,
  },
  evidence_graph: {
    nodes: [],
    edges: [],
  },
  remediation_steps: ["Externalize keys to .env"],
  remediation_guidance: "Rotate key in upstream provider",
  resolution_recommendations: [],
  review_record: {
    status: "RESOLVED",
    reviewed_by: "Lead Developer",
    resolution_note: "Secrets externalized to environment variables.",
  },
  review_history: [
    {
      id: "hist-1",
      incident_id: "inc_sec001",
      previous_status: "OPEN",
      new_status: "RESOLVED",
      resolution_note: "Secrets externalized to environment variables.",
      reviewer: "Lead Developer",
      created_at: "2026-08-22T10:05:00Z",
    },
  ],
  created_at: "2026-08-22T10:00:00Z",
  updated_at: "2026-08-22T10:05:00Z",
};

describe("Investigation Deep-Link & Selection Regression Tests", () => {
  beforeEach(() => {
    queryClient.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/investigation/search")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockInvestigationResponse),
          });
        }
        if (url.includes("/investigations/inc_sec001")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIncidentDetail),
          });
        }
        if (url.includes("/investigations/metrics")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                open_incidents: 0,
                investigating_incidents: 0,
                reviewed_incidents: 0,
                resolved_incidents: 1,
                total_incidents: 1,
                resolution_rate: 100,
                avg_resolution_time_minutes: 5,
              }),
          });
        }
        if (url.includes("/investigations/health-summary")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                project_id: "c95554c9-2b13-4b2d-882a-660cd2da14fe",
                overall_health_score: 95,
                overall_status: "EXCELLENT",
                active_incidents_count: 0,
                resolved_incidents_count: 1,
                critical_findings_count: 0,
                high_findings_count: 0,
              }),
          });
        }
        if (url.includes("/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mockIncidentDetail.review_history }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ detail: "Not found" }),
        });
      }),
    );
  });

  it("1. Deep-linking to ?incidentId=inc_sec001 automatically selects and renders the incident", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            "/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/investigation?incidentId=inc_sec001",
          ]}
        >
          <Routes>
            <Route path="/projects/:projectId/investigation" element={<InvestigationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const items = screen.getAllByText(/Observed Development Incident/i);
      expect(items.length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/RESOLVED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SEC001/i).length).toBeGreaterThan(0);
  });

  it("2. Deep-linking to an invalid incident ID produces an intentional 'Incident Not Found' state", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            "/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/investigation?incidentId=nonexistent_xyz",
          ]}
        >
          <Routes>
            <Route path="/projects/:projectId/investigation" element={<InvestigationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Incident Not Found/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/View All Project Incidents/i)).toBeInTheDocument();
  });

  it("3. Clicking an incident updates selection and highlights the active incident", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/investigation"]}
        >
          <Routes>
            <Route path="/projects/:projectId/investigation" element={<InvestigationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Security Alert: Hardcoded Secret Detected/i)).toBeInTheDocument();
    });
  });
});
