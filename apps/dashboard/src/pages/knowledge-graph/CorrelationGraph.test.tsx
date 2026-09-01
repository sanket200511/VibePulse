import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CorrelationGraphCanvas } from "./CorrelationGraphCanvas";
import { CorrelationGraphInspector } from "./CorrelationGraphInspector";
import type { KnowledgeGraphNode, KnowledgeGraphEdge } from "./types";

const mockNodes: KnowledgeGraphNode[] = [
  {
    node_id: "project-1",
    node_type: "Project",
    project_id: "334351d3-4aeb-4bc4-9387-f22e236acda8",
    label: "VibePulse-Seminar-Demo",
    subsystem: null,
    metadata: { overall_health_score: 95 },
    provenance: "OBSERVED",
  },
  {
    node_id: "file-settings",
    node_type: "File",
    project_id: "334351d3-4aeb-4bc4-9387-f22e236acda8",
    label: "settings.py",
    subsystem: "Configuration",
    metadata: { file_path: "config/settings.py", activity_count: 5, language: "Python" },
    provenance: "OBSERVED",
  },
  {
    node_id: "sec-SEC001",
    node_type: "SecurityFinding",
    project_id: "334351d3-4aeb-4bc4-9387-f22e236acda8",
    label: "SEC001: Hardcoded Credential",
    subsystem: "Configuration",
    metadata: {
      finding_id: "f-1",
      rule_id: "SEC001",
      severity: "CRITICAL",
      risk_contribution: 15,
      evidence: "API_KEY = '[REDACTED]'",
    },
    provenance: "OBSERVED",
  },
  {
    node_id: "incident-INC01",
    node_type: "Incident",
    project_id: "334351d3-4aeb-4bc4-9387-f22e236acda8",
    label: "INC01: Credential Exposure",
    subsystem: "Configuration",
    metadata: {
      incident_id: "INC01",
      severity: "CRITICAL",
      status: "RESOLVED",
      risk_score: 85,
    },
    provenance: "OBSERVED",
  },
];

const mockEdges: KnowledgeGraphEdge[] = [
  {
    relationship_id: "rel-1",
    source_node_id: "file-settings",
    target_node_id: "sec-SEC001",
    relationship_type: "CONTAINS_FINDING",
    label: "settings.py contains SEC001",
    reason: "AST Security Guardian detected SEC001 in config/settings.py",
    evidence_references: ["SEC001", "config/settings.py"],
    provenance: "OBSERVED",
    metadata: {},
  },
  {
    relationship_id: "rel-2",
    source_node_id: "sec-SEC001",
    target_node_id: "incident-INC01",
    relationship_type: "CONTRIBUTED_TO",
    label: "SEC001 contributed to incident INC01",
    reason: "Finding SEC001 contributed +15 risk points to incident INC01",
    evidence_references: ["f-1", "INC01"],
    provenance: "OBSERVED",
    metadata: {},
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("CorrelationGraphCanvas", () => {
  it("renders canvas container and svg element", () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    const { container } = render(
      <CorrelationGraphCanvas
        nodes={mockNodes}
        edges={mockEdges}
        selectedNode={null}
        selectedEdge={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        focusNodeId={null}
        focusDepth={4}
      />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("settings.py")).toBeInTheDocument();
  });

  it("handles node selection click", () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <CorrelationGraphCanvas
        nodes={mockNodes}
        edges={mockEdges}
        selectedNode={null}
        selectedEdge={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        focusNodeId={null}
        focusDepth={4}
      />,
    );

    const nodeLabel = screen.getByText("settings.py");
    fireEvent.click(nodeLabel);
    expect(onSelectNode).toHaveBeenCalled();
  });

  it("renders the fullscreen button with toggle capability", () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();

    render(
      <CorrelationGraphCanvas
        nodes={mockNodes}
        edges={mockEdges}
        selectedNode={null}
        selectedEdge={null}
        onSelectNode={onSelectNode}
        onSelectEdge={onSelectEdge}
        focusNodeId={null}
        focusDepth={4}
      />,
    );

    const fullscreenBtn = screen.getByTitle(/Fullscreen Mode/i);
    expect(fullscreenBtn).toBeInTheDocument();
    fireEvent.click(fullscreenBtn);
  });
});

describe("CorrelationGraphInspector", () => {
  it("renders idle state with quick focus suggestions", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CorrelationGraphInspector
            projectId="334351d3-4aeb-4bc4-9387-f22e236acda8"
            selectedNode={null}
            selectedEdge={null}
            allNodes={mockNodes}
            allEdges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            onFocusNode={vi.fn()}
            onTraceRootCause={vi.fn()}
            onTraceImpact={vi.fn()}
            onOpenEvidence={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Intelligence Inspector/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Focus Entities/i)).toBeInTheDocument();
  });

  it("renders selected node details and action buttons", () => {
    const queryClient = createTestQueryClient();
    const onTraceRootCause = vi.fn();
    const onTraceImpact = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CorrelationGraphInspector
            projectId="334351d3-4aeb-4bc4-9387-f22e236acda8"
            selectedNode={mockNodes[2] ?? null}
            selectedEdge={null}
            allNodes={mockNodes}
            allEdges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            onFocusNode={vi.fn()}
            onTraceRootCause={onTraceRootCause}
            onTraceImpact={onTraceImpact}
            onOpenEvidence={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("SecurityFinding")).toBeInTheDocument();
    expect(screen.getByText("SEC001: Hardcoded Credential")).toBeInTheDocument();
    expect(screen.getByText("+15 points")).toBeInTheDocument();
    expect(screen.getByText("Trace Root Cause")).toBeInTheDocument();
    expect(screen.getByText("Trace Impact")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Trace Root Cause"));
    expect(onTraceRootCause).toHaveBeenCalledWith("sec-SEC001");

    fireEvent.click(screen.getByText("Trace Impact"));
    expect(onTraceImpact).toHaveBeenCalledWith("sec-SEC001");
  });

  it("renders selected edge details and why-this-connection reason", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CorrelationGraphInspector
            projectId="334351d3-4aeb-4bc4-9387-f22e236acda8"
            selectedNode={null}
            selectedEdge={mockEdges[0] ?? null}
            allNodes={mockNodes}
            allEdges={mockEdges}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            onFocusNode={vi.fn()}
            onTraceRootCause={vi.fn()}
            onTraceImpact={vi.fn()}
            onOpenEvidence={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("CONTAINS_FINDING")).toBeInTheDocument();
    expect(screen.getByText("WHY THIS CONNECTION?")).toBeInTheDocument();
    expect(
      screen.getByText("AST Security Guardian detected SEC001 in config/settings.py"),
    ).toBeInTheDocument();
  });
});
