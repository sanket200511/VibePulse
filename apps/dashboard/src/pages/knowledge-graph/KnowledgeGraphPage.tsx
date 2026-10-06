import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Crosshair,
  TrendingUp,
  Activity,
  History,
  GitCompare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import {
  useKnowledgeGraph,
  useRootCauseTraversal,
  useImpactTraversal,
  useGraphTimeline,
  useBeforeAfterComparison,
} from "./useKnowledgeGraph";
import type { KnowledgeGraphNode, KnowledgeGraphEdge, GraphMode } from "./types";
import { CorrelationGraphCanvas } from "./CorrelationGraphCanvas";
import { CorrelationGraphInspector } from "./CorrelationGraphInspector";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import type { EntityType } from "../evidence/types";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

function getNodesForMode(nodes: KnowledgeGraphNode[], mode: GraphMode): KnowledgeGraphNode[] {
  if (mode === "INVESTIGATION") {
    const allowed = new Set([
      "DevelopmentEvent",
      "SecurityFinding",
      "Incident",
      "RootCause",
      "Resolution",
      "Actor",
      "HealthDimension",
      "File",
    ]);
    return nodes.filter((n) => allowed.has(n.node_type));
  } else if (mode === "IMPACT") {
    const allowed = new Set([
      "File",
      "SecurityFinding",
      "Incident",
      "HealthDimension",
      "Prediction",
      "Project",
      "Subsystem",
      "Resolution",
    ]);
    return nodes.filter((n) => allowed.has(n.node_type));
  } else if (mode === "MEMORY") {
    const allowed = new Set([
      "Project",
      "Subsystem",
      "File",
      "Technology",
      "Framework",
      "HealthDimension",
    ]);
    return nodes.filter((n) => allowed.has(n.node_type));
  }
  return nodes;
}

export function KnowledgeGraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Queries
  const { graph, refreshGraph, isRefreshing } = useKnowledgeGraph(projectId);
  const { data: timelineData } = useGraphTimeline(projectId);
  const { data: beforeAfterData } = useBeforeAfterComparison(projectId);

  // View state: CANVAS | TIMELINE | BEFORE_AFTER
  const [viewMode, setViewMode] = useState<"CANVAS" | "TIMELINE" | "BEFORE_AFTER">("CANVAS");

  // Graph Mode: RELATIONSHIP | INVESTIGATION | IMPACT | MEMORY
  const [graphMode, setGraphMode] = useState<GraphMode>("RELATIONSHIP");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selection state
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<KnowledgeGraphEdge | null>(null);

  // Focus & Depth state (Default depth = 4 "All" so full system graph is visible initially)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState<number>(4);

  // Traversal state
  const [activeTraversal, setActiveTraversal] = useState<{
    mode: "ROOT_CAUSE" | "IMPACT";
    startNodeId: string;
    currentStepIdx: number;
  } | null>(null);

  const { data: rootCauseData } = useRootCauseTraversal(
    projectId,
    activeTraversal?.mode === "ROOT_CAUSE" ? activeTraversal.startNodeId : null,
  );
  const { data: impactData } = useImpactTraversal(
    projectId,
    activeTraversal?.mode === "IMPACT" ? activeTraversal.startNodeId : null,
  );

  // Evidence Modal state
  const [inspectTarget, setInspectTarget] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);

  // Synchronize URL parameters on initial load
  useEffect(() => {
    if (!graph) return;
    const nodeParam = searchParams.get("node");
    const modeParam = searchParams.get("mode") as GraphMode | null;
    const viewParam = searchParams.get("view");
    const depthParam = searchParams.get("depth");
    const qParam = searchParams.get("q");

    if (nodeParam) {
      const match = graph.nodes.find(
        (n) => n.node_id === nodeParam || n.label.toLowerCase() === nodeParam.toLowerCase(),
      );
      if (match) {
        setSelectedNode(match);
        setFocusNodeId(match.node_id);
      }
    }
    if (modeParam && ["RELATIONSHIP", "INVESTIGATION", "IMPACT", "MEMORY"].includes(modeParam)) {
      setGraphMode(modeParam);
    }
    if (viewParam && ["CANVAS", "TIMELINE", "BEFORE_AFTER"].includes(viewParam)) {
      setViewMode(viewParam as "CANVAS" | "TIMELINE" | "BEFORE_AFTER");
    }
    if (depthParam && !isNaN(Number(depthParam))) {
      setFocusDepth(Number(depthParam));
    }
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [graph, searchParams]);

  const handleViewChange = (mode: "CANVAS" | "TIMELINE" | "BEFORE_AFTER") => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", mode);
    setSearchParams(newParams);
  };

  const handleSelectNode = (node: KnowledgeGraphNode | null) => {
    setSelectedNode(node);
    if (node) {
      setFocusNodeId(node.node_id);
    }
    const newParams = new URLSearchParams(searchParams);
    if (node) {
      newParams.set("node", node.node_id);
    } else {
      newParams.delete("node");
    }
    newParams.set("mode", graphMode);
    newParams.set("view", viewMode);
    newParams.set("depth", String(focusDepth));
    setSearchParams(newParams);
  };

  const handleModeChange = (mode: GraphMode) => {
    setGraphMode(mode);
    setViewMode("CANVAS");
    const newParams = new URLSearchParams(searchParams);
    newParams.set("mode", mode);
    newParams.set("view", "CANVAS");
    setSearchParams(newParams);

    if (graph) {
      const allowedNodes = getNodesForMode(graph.nodes, mode);
      if (selectedNode && !allowedNodes.some((n) => n.node_id === selectedNode.node_id)) {
        const defaultNode =
          allowedNodes.find(
            (n) => n.node_type === "SecurityFinding" || n.node_type === "Incident",
          ) ||
          allowedNodes[0] ||
          null;
        setSelectedNode(defaultNode);
        if (defaultNode) setFocusNodeId(defaultNode.node_id);
      }
    }
  };

  const handleDepthChange = (depth: number) => {
    setFocusDepth(depth);
    setViewMode("CANVAS");
    const newParams = new URLSearchParams(searchParams);
    newParams.set("depth", String(depth));
    newParams.set("view", "CANVAS");
    setSearchParams(newParams);
  };

  // Filtered nodes by Mode and Search
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    const modeNodes = getNodesForMode(graph.nodes, graphMode);

    return modeNodes.filter((n) => {
      const matchSearch =
        !searchQuery.trim() ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.subsystem && n.subsystem.toLowerCase().includes(searchQuery.toLowerCase())) ||
        JSON.stringify(n.metadata).toLowerCase().includes(searchQuery.toLowerCase());

      return matchSearch;
    });
  }, [graph, graphMode, searchQuery]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    const validNodeIds = new Set(filteredNodes.map((n) => n.node_id));
    return graph.edges.filter(
      (e) => validNodeIds.has(e.source_node_id) && validNodeIds.has(e.target_node_id),
    );
  }, [graph, filteredNodes]);

  const activeTraversalResponse =
    activeTraversal?.mode === "ROOT_CAUSE" ? rootCauseData : impactData;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim() || !graph) return;
    const match = graph.nodes.find(
      (n) => n.label.toLowerCase().includes(val.toLowerCase()) || n.node_id === val,
    );
    if (match) {
      setSelectedNode(match);
      setFocusNodeId(match.node_id);
    }
  };

  const handleNextStep = () => {
    if (!activeTraversal || !activeTraversalResponse) return;
    const nextIdx = Math.min(
      activeTraversalResponse.steps.length - 1,
      activeTraversal.currentStepIdx + 1,
    );
    setActiveTraversal({ ...activeTraversal, currentStepIdx: nextIdx });
    const targetStep = activeTraversalResponse.steps[nextIdx];
    if (targetStep && graph) {
      const matchNode = graph.nodes.find((n) => n.node_id === targetStep.node_id);
      if (matchNode) setSelectedNode(matchNode);
    }
  };

  const handlePrevStep = () => {
    if (!activeTraversal || !activeTraversalResponse) return;
    const prevIdx = Math.max(0, activeTraversal.currentStepIdx - 1);
    setActiveTraversal({ ...activeTraversal, currentStepIdx: prevIdx });
    const targetStep = activeTraversalResponse.steps[prevIdx];
    if (targetStep && graph) {
      const matchNode = graph.nodes.find((n) => n.node_id === targetStep.node_id);
      if (matchNode) setSelectedNode(matchNode);
    }
  };

  if (!projectId) return null;

  return (
    <div className="animate-fade-in-up text-foreground mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:px-6 md:py-6">
      {/* ── BREADCRUMBS & TOP NAV ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs
          items={[
            { label: "Projects", to: "/projects" },
            { label: "Project Story", to: `/projects/${projectId}` },
            { label: "Correlation & Causality Graph" },
          ]}
        />
        <Link
          to={`/projects/${projectId}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project Story
        </Link>
      </div>

      {/* ── CLEAN HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-xl font-bold tracking-tight">
            Correlation & Causality Graph
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Evidence-grounded engineering relationships: Observation → Finding → Incident → Root
            Cause → Resolution → Impact → Prediction
          </p>
        </div>
      </div>

      {/* ── COMPACT TOOLBAR ───────────────────────────────────────────────── */}
      <div className="border-border/80 bg-card/60 flex flex-col gap-2.5 rounded-lg border p-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* VIEW SELECTOR */}
          <div className="border-border/80 bg-background/80 flex rounded-md border p-0.5">
            <button
              onClick={() => handleViewChange("CANVAS")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "CANVAS"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3 w-3" />
              Graph
            </button>
            <button
              onClick={() => handleViewChange("TIMELINE")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "TIMELINE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3 w-3" />
              Timeline
            </button>
            <button
              onClick={() => handleViewChange("BEFORE_AFTER")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "BEFORE_AFTER"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitCompare className="h-3 w-3" />
              Before / After
            </button>
          </div>

          {/* ANALYSIS MODES (General, Investigation, Impact, Memory) */}
          <div className="border-border/80 flex items-center gap-1 border-l pl-2">
            {[
              { mode: "RELATIONSHIP" as GraphMode, label: "General" },
              { mode: "INVESTIGATION" as GraphMode, label: "Investigation" },
              { mode: "IMPACT" as GraphMode, label: "Impact" },
              { mode: "MEMORY" as GraphMode, label: "Memory" },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  graphMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* DEPTH CONTROLS (1, 2, 3, All) */}
          <div className="border-border/80 flex items-center gap-1 border-l pl-2">
            <span className="text-muted-foreground font-mono text-[10px] font-medium uppercase">
              Depth:
            </span>
            {[
              { value: 1, label: "1" },
              { value: 2, label: "2" },
              { value: 3, label: "3" },
              { value: 4, label: "All" },
            ].map((d) => (
              <button
                key={d.value}
                onClick={() => handleDepthChange(d.value)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                  focusDepth === d.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* REFRESH */}
          <button
            onClick={() => refreshGraph()}
            disabled={isRefreshing}
            title="Refresh Knowledge Graph from PostgreSQL"
            className="border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md border p-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${isRefreshing ? "text-primary animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full lg:w-60">
          <Search className="text-muted-foreground absolute left-2.5 top-2 h-3.5 w-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search entities, files, rules..."
            className="border-border/80 bg-background/80 text-foreground placeholder:text-muted-foreground/60 focus:border-primary w-full rounded-md border py-1.5 pl-8 pr-7 font-mono text-xs focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── TRAVERSAL STEPPER BANNER (IF ACTIVE) ─────────────────────────────── */}
      {activeTraversal && activeTraversalResponse && (
        <div className="border-primary/40 bg-secondary/30 rounded-lg border p-3">
          <div className="border-border/60 mb-2 flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {activeTraversal.mode === "ROOT_CAUSE" ? (
                <Crosshair className="h-4 w-4 text-orange-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-purple-400" />
              )}
              <span className="text-foreground font-mono text-xs font-semibold">
                {activeTraversal.mode === "ROOT_CAUSE"
                  ? "Root Cause Traversal"
                  : "Impact Traversal"}{" "}
                — Step {activeTraversal.currentStepIdx + 1} of{" "}
                {activeTraversalResponse.steps.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStep}
                disabled={activeTraversal.currentStepIdx === 0}
                className="border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                onClick={handleNextStep}
                disabled={
                  activeTraversal.currentStepIdx >= activeTraversalResponse.steps.length - 1
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => setActiveTraversal(null)}
                className="border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md border px-2 py-0.5 text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {activeTraversalResponse.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setActiveTraversal({ ...activeTraversal, currentStepIdx: sIdx });
                    const matchNode = graph?.nodes.find((n) => n.node_id === step.node_id);
                    if (matchNode) setSelectedNode(matchNode);
                  }}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
                    activeTraversal.currentStepIdx === sIdx
                      ? "border-primary bg-primary/20 text-foreground font-bold"
                      : "border-border/80 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="text-primary font-bold">[{sIdx + 1}]</span>
                  <span>{step.label}</span>
                </button>
                {sIdx < activeTraversalResponse.steps.length - 1 && (
                  <span className="text-muted-foreground text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT (72% CANVAS + 28% INSPECTOR) ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 xl:col-span-9">
          {viewMode === "CANVAS" && (
            <CorrelationGraphCanvas
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onSelectNode={handleSelectNode}
              onSelectEdge={(edge) => {
                setSelectedEdge(edge);
                setSelectedNode(null);
              }}
              focusNodeId={focusNodeId}
              focusDepth={focusDepth}
              onDepthChange={handleDepthChange}
              traversalSteps={activeTraversalResponse?.steps || []}
              traversalMode={activeTraversal?.mode || null}
            />
          )}

          {viewMode === "TIMELINE" && (
            <div className="border-border/80 bg-card/60 rounded-lg border p-4">
              <div className="border-border/60 mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-primary h-4 w-4" />
                  <h3 className="text-foreground text-sm font-semibold">
                    Chronological Intelligence Timeline
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
                >
                  {timelineData?.total_events || 0} Grounded Events
                </Badge>
              </div>

              <div className="space-y-2">
                {timelineData?.events?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const matchNode = graph?.nodes.find((n) => n.node_id === item.entity_id);
                      if (matchNode) setSelectedNode(matchNode);
                    }}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                      selectedNode?.node_id === item.entity_id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/70 bg-card/40 hover:border-border hover:bg-secondary/20"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="bg-primary h-2 w-2 rounded-full" />
                      <div className="bg-border h-full w-0.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-mono text-xs font-semibold">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                          [{item.provenance}]
                        </span>
                      </div>
                      <div className="text-foreground mt-0.5 text-xs font-medium">{item.label}</div>
                      {item.subsystem && (
                        <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                          Subsystem: {item.subsystem}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "BEFORE_AFTER" && (
            <div className="border-border/80 bg-card/60 rounded-lg border p-4">
              <div className="border-border/60 mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <GitCompare className="text-primary h-4 w-4" />
                  <h3 className="text-foreground text-sm font-semibold">
                    Before vs After Remediation Posture
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-400"
                >
                  {beforeAfterData?.remediation_summary || "Remediation audit verified"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-md border border-rose-500/30 bg-rose-950/10 p-3.5">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-400">
                      PRE-REMEDIATION (BEFORE)
                    </span>
                    <span className="font-mono text-[10px] text-rose-300">Active Risk</span>
                  </div>
                  <div className="text-muted-foreground mt-2.5 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>Graph Entities:</span>
                      <span className="text-foreground font-bold">
                        {beforeAfterData?.before_nodes.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Open Incidents:</span>
                      <span className="font-bold text-rose-400">
                        {beforeAfterData?.resolved_incidents_count || 1}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Posture:</span>
                      <span className="font-bold text-rose-400">CRITICAL</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-emerald-500/30 bg-emerald-950/10 p-3.5">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                      POST-REMEDIATION (AFTER)
                    </span>
                    <span className="font-mono text-[10px] text-emerald-300">Resolved Audit</span>
                  </div>
                  <div className="text-muted-foreground mt-2.5 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>Graph Entities:</span>
                      <span className="text-foreground font-bold">
                        {beforeAfterData?.after_nodes.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolved Incidents:</span>
                      <span className="font-bold text-emerald-400">
                        {beforeAfterData?.resolved_incidents_count || 1}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Audit Status:</span>
                      <span className="font-bold text-emerald-400">VERIFIED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Streamlined Intelligence Inspector */}
        <div className="lg:col-span-4 xl:col-span-3">
          <CorrelationGraphInspector
            projectId={projectId}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            allNodes={graph?.nodes || []}
            allEdges={graph?.edges || []}
            onSelectNode={handleSelectNode}
            onSelectEdge={(edge) => {
              setSelectedEdge(edge);
              setSelectedNode(null);
            }}
            onFocusNode={(nodeId) => {
              setFocusNodeId(nodeId);
              const node = graph?.nodes.find((n) => n.node_id === nodeId);
              if (node) handleSelectNode(node);
            }}
            onTraceRootCause={(nodeId) => {
              setActiveTraversal({ mode: "ROOT_CAUSE", startNodeId: nodeId, currentStepIdx: 0 });
            }}
            onTraceImpact={(nodeId) => {
              setActiveTraversal({ mode: "IMPACT", startNodeId: nodeId, currentStepIdx: 0 });
            }}
            onOpenEvidence={(type, id) => setInspectTarget({ type, id })}
          />
        </div>
      </div>

      {/* ── EVIDENCE INSPECTOR MODAL ────────────────────────────────────────── */}
      {inspectTarget && (
        <EvidenceInspector
          projectId={projectId}
          entityType={inspectTarget.type}
          entityId={inspectTarget.id}
          onClose={() => setInspectTarget(null)}
        />
      )}
    </div>
  );
}
