import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Search,
  RotateCcw,
  FileCode,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Layers,
  FolderTree,
  Cpu,
  HelpCircle,
  Info,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import {
  useKnowledgeGraph,
  useFileIntelligence,
  useSubsystemIntelligence,
} from "./useKnowledgeGraph";
import type { KnowledgeGraphNode, KnowledgeGraphEdge, KnowledgeGraphNodeType } from "./types";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import type { EntityType } from "../evidence/types";

export function KnowledgeGraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { graph, isLoading, refreshGraph, isRefreshing } = useKnowledgeGraph(projectId);

  // Filters & Search
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>("ALL");
  const [selectedNodeType, setSelectedNodeType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Drawer / Selection state
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<KnowledgeGraphEdge | null>(null);

  // Evidence Inspector Modal state
  const [inspectTarget, setInspectTarget] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);

  // Node details hooks
  const selectedFilePath =
    selectedNode?.node_type === "File" ? selectedNode.metadata.file_path : null;
  const { data: fileIntel } = useFileIntelligence(projectId, selectedFilePath);

  const selectedSubsystemName = selectedNode?.node_type === "Subsystem" ? selectedNode.label : null;
  const { data: subsysIntel } = useSubsystemIntelligence(projectId, selectedSubsystemName);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => {
      const matchSub =
        selectedSubsystem === "ALL" ||
        (n.subsystem && n.subsystem.toLowerCase() === selectedSubsystem.toLowerCase());
      const matchType =
        selectedNodeType === "ALL" || n.node_type.toLowerCase() === selectedNodeType.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.subsystem && n.subsystem.toLowerCase().includes(searchQuery.toLowerCase())) ||
        JSON.stringify(n.metadata).toLowerCase().includes(searchQuery.toLowerCase());
      return matchSub && matchType && matchSearch;
    });
  }, [graph, selectedSubsystem, selectedNodeType, searchQuery]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    const validNodeIds = new Set(filteredNodes.map((n) => n.node_id));
    return graph.edges.filter(
      (e) => validNodeIds.has(e.source_node_id) && validNodeIds.has(e.target_node_id),
    );
  }, [graph, filteredNodes]);

  // Group nodes by Subsystem for structured layout
  const nodesBySubsystem = useMemo(() => {
    const map: Record<string, KnowledgeGraphNode[]> = {};
    for (const node of filteredNodes) {
      const sub = node.subsystem || "General Architecture";
      if (!map[sub]) map[sub] = [];
      map[sub].push(node);
    }
    return map;
  }, [filteredNodes]);

  const getNodeIcon = (type: KnowledgeGraphNodeType) => {
    switch (type) {
      case "File":
        return <FileCode className="h-4 w-4 text-cyan-400" />;
      case "SecurityFinding":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case "Incident":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "Prediction":
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case "Resolution":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "Subsystem":
        return <Layers className="h-4 w-4 text-indigo-400" />;
      case "Technology":
      case "Framework":
        return <Cpu className="h-4 w-4 text-teal-400" />;
      default:
        return <FolderTree className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProvenanceBadgeClass = (prov: string) => {
    switch (prov) {
      case "OBSERVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "INFERRED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  if (!projectId) return null;

  return (
    <div className="animate-fade-in-up bg-background flex flex-1 flex-col space-y-6 p-8">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to={`/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Project Story
            </Link>
            <span className="text-gray-600">/</span>
            <Link
              to={`/projects/${projectId}/command-center`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 transition hover:text-indigo-300"
            >
              Engineering Command Center
            </Link>
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <Share2 className="h-6 w-6 text-indigo-400" />
            Engineering Knowledge Graph & Project Memory
          </h1>
          <p className="text-xs text-gray-400">
            Deterministic relationship projection across files, subsystems, security findings,
            incidents, predictions, and resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshGraph()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/80 px-3.5 py-2 text-xs font-semibold text-gray-200 transition hover:border-gray-700 hover:bg-gray-800 disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`}
            />
            Refresh Projection
          </button>
        </div>
      </div>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      {graph && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
            <div className="text-[11px] font-medium text-gray-400">Total Entities</div>
            <div className="mt-1 text-xl font-bold text-white">{graph.total_nodes}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
            <div className="text-[11px] font-medium text-gray-400">Relationships</div>
            <div className="mt-1 text-xl font-bold text-indigo-400">{graph.total_edges}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
            <div className="text-[11px] font-medium text-gray-400">Active Subsystems</div>
            <div className="mt-1 text-xl font-bold text-white">{graph.subsystems.length}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
            <div className="text-[11px] font-medium text-gray-400">Security Findings</div>
            <div className="mt-1 text-xl font-bold text-rose-400">
              {graph.node_count_by_type["SecurityFinding"] || 0}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
            <div className="text-[11px] font-medium text-gray-400">Correlated Incidents</div>
            <div className="mt-1 text-xl font-bold text-amber-400">
              {graph.node_count_by_type["Incident"] || 0}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
            <div className="text-[11px] font-medium text-gray-400">Forecast Signals</div>
            <div className="mt-1 text-xl font-bold text-purple-400">
              {graph.node_count_by_type["Prediction"] || 0}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTROLS & SEARCH ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Subsystem:</span>
            <button
              onClick={() => setSelectedSubsystem("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedSubsystem === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
              }`}
            >
              All ({graph?.total_nodes || 0})
            </button>
            {graph?.subsystems.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubsystem(sub)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedSubsystem === sub
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-l border-gray-800 pl-4">
            <span className="text-xs font-semibold text-gray-400">Type:</span>
            {["ALL", "File", "SecurityFinding", "Incident", "Prediction"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedNodeType(t)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedNodeType === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {t === "SecurityFinding" ? "Findings" : t === "ALL" ? "All Types" : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities, files, rules..."
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── GRAPH CANVAS & RELATIONSHIPS VIEW ───────────────────────────────── */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/20">
          <div className="flex flex-col items-center gap-3">
            <RotateCcw className="h-6 w-6 animate-spin text-indigo-400" />
            <p className="text-xs text-gray-400">Materializing Knowledge Graph projection...</p>
          </div>
        </div>
      ) : filteredNodes.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/20">
          <p className="text-sm text-gray-500">No graph entities matching active filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Subsystem Clustering Columns (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {Object.entries(nodesBySubsystem).map(([subsystemName, nodes]) => (
              <div
                key={subsystemName}
                className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40 p-5 backdrop-blur-sm"
              >
                <div className="mb-4 flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 text-indigo-400" />
                    <h3 className="font-semibold text-white">{subsystemName}</h3>
                    <Badge variant="outline" className="text-[10px] text-gray-400">
                      {nodes.length} entities
                    </Badge>
                  </div>
                  <button
                    onClick={() => {
                      const subNode = graph?.nodes.find(
                        (n) => n.node_type === "Subsystem" && n.label === subsystemName,
                      );
                      if (subNode) setSelectedNode(subNode);
                    }}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Subsystem Intelligence →
                  </button>
                </div>

                {/* Grid of Nodes in this Subsystem */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {nodes.map((node) => {
                    const isSelected = selectedNode?.node_id === node.node_id;
                    return (
                      <div
                        key={node.node_id}
                        onClick={() => {
                          setSelectedNode(node);
                          setSelectedEdge(null);
                        }}
                        className={`cursor-pointer rounded-xl border p-3.5 transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                            : "border-gray-800/80 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-900/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getNodeIcon(node.node_type)}
                            <span className="text-[11px] font-semibold text-gray-400">
                              {node.node_type}
                            </span>
                          </div>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getProvenanceBadgeClass(
                              node.provenance,
                            )}`}
                          >
                            [{node.provenance}]
                          </span>
                        </div>

                        <div className="mt-2 truncate font-mono text-xs font-medium text-white">
                          {node.label}
                        </div>

                        {/* Node mini-stats */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                          {node.node_type === "File" && (
                            <>
                              <span>{node.metadata.activity_count || 0} events</span>
                              <span>•</span>
                              <span>{node.metadata.language}</span>
                            </>
                          )}
                          {node.node_type === "SecurityFinding" && (
                            <span className="font-semibold text-rose-400">
                              +{node.metadata.risk_contribution} risk points
                            </span>
                          )}
                          {node.node_type === "Incident" && (
                            <span className="font-semibold text-amber-400">
                              Risk: {node.metadata.risk_score} ({node.metadata.status})
                            </span>
                          )}
                          {node.node_type === "Prediction" && (
                            <span className="text-purple-400">
                              {node.metadata.evidence_strength} strength
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subsystem Edges / Relationships Summary */}
                <div className="mt-4 border-t border-gray-800/60 pt-3">
                  <div className="mb-2 text-[11px] font-semibold text-gray-400">
                    Connected Relationships:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredEdges
                      .filter((e) => {
                        const sNode = graph?.nodes.find((n) => n.node_id === e.source_node_id);
                        return sNode?.subsystem === subsystemName;
                      })
                      .slice(0, 4)
                      .map((edge) => (
                        <button
                          key={edge.relationship_id}
                          onClick={() => {
                            setSelectedEdge(edge);
                            setSelectedNode(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1 text-[10px] text-gray-300 hover:border-indigo-500/50 hover:text-white"
                        >
                          <span className="font-bold text-indigo-400">
                            {edge.relationship_type}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="max-w-[120px] truncate">{edge.label}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Details / Inspector Drawer (1 col) */}
          <div className="space-y-6">
            {selectedNode ? (
              <div className="sticky top-8 rounded-2xl border border-indigo-500/40 bg-gray-900/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    {getNodeIcon(selectedNode.node_type)}
                    <h3 className="text-sm font-bold text-white">
                      {selectedNode.node_type} Details
                    </h3>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getProvenanceBadgeClass(
                      selectedNode.provenance,
                    )}`}
                  >
                    [{selectedNode.provenance}]
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400">Entity Label:</div>
                    <div className="break-all font-mono text-xs font-medium text-white">
                      {selectedNode.label}
                    </div>
                  </div>

                  {selectedNode.subsystem && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400">Subsystem:</div>
                      <div className="text-xs font-semibold text-indigo-400">
                        {selectedNode.subsystem}
                      </div>
                    </div>
                  )}

                  {/* File-Specific Intelligence */}
                  {selectedNode.node_type === "File" && fileIntel && (
                    <div className="space-y-2.5 rounded-xl border border-gray-800 bg-gray-950/70 p-3 text-xs">
                      <div className="font-semibold text-gray-300">File Intelligence</div>
                      <div className="flex justify-between text-gray-400">
                        <span>Total Events:</span>
                        <span className="font-bold text-white">{fileIntel.activity_count}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Security Findings:</span>
                        <span className="font-bold text-rose-400">{fileIntel.findings_count}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Associated Incidents:</span>
                        <span className="font-bold text-amber-400">
                          {fileIntel.incidents_count}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Forecast Predictions:</span>
                        <span className="font-bold text-purple-400">
                          {fileIntel.predictions_count}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Subsystem-Specific Intelligence */}
                  {selectedNode.node_type === "Subsystem" && subsysIntel && (
                    <div className="space-y-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-3 text-xs">
                      <div className="font-semibold text-indigo-300">Subsystem Posture</div>
                      <div className="flex justify-between text-gray-400">
                        <span>Total Files:</span>
                        <span className="font-bold text-white">{subsysIntel.file_count}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Total Activity:</span>
                        <span className="font-bold text-white">
                          {subsysIntel.activity_count} events
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Subsystem Risk:</span>
                        <span className="font-bold text-rose-400">
                          +{subsysIntel.risk_score} pts ({subsysIntel.health_status})
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Open Incidents:</span>
                        <span className="font-bold text-amber-400">
                          {subsysIntel.open_incidents_count}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Security-Specific Detail */}
                  {selectedNode.node_type === "SecurityFinding" && (
                    <div className="space-y-2 rounded-xl border border-rose-500/20 bg-rose-950/10 p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Severity:</span>
                        <span className="font-bold text-rose-400">
                          {selectedNode.metadata.severity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Risk Contribution:</span>
                        <span className="font-bold text-white">
                          +{selectedNode.metadata.risk_contribution}
                        </span>
                      </div>
                      {selectedNode.metadata.evidence && (
                        <div>
                          <div className="text-[10px] text-gray-400">Redacted Evidence:</div>
                          <pre className="mt-1 overflow-x-auto rounded bg-black/60 p-2 font-mono text-[11px] text-gray-300">
                            {selectedNode.metadata.evidence}
                          </pre>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setInspectTarget({
                            type: "security",
                            id: selectedNode.metadata.rule_id || "current",
                          })
                        }
                        className="mt-2 w-full rounded bg-rose-500/20 py-1.5 text-center text-xs font-semibold text-rose-300 hover:bg-rose-500/30"
                      >
                        [Why?] Inspect Security Evidence
                      </button>
                    </div>
                  )}

                  {/* Incident-Specific Detail */}
                  {selectedNode.node_type === "Incident" && (
                    <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="font-bold text-amber-400">
                          {selectedNode.metadata.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Risk Score:</span>
                        <span className="font-bold text-white">
                          {selectedNode.metadata.risk_score}/100
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setInspectTarget({
                            type: "incident",
                            id: selectedNode.metadata.incident_id || "latest",
                          })
                        }
                        className="mt-2 w-full rounded bg-amber-500/20 py-1.5 text-center text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
                      >
                        [Why?] Inspect Incident Evidence
                      </button>
                    </div>
                  )}

                  {/* Metadata JSON Dump */}
                  <div className="pt-2">
                    <div className="text-[10px] font-semibold text-gray-500">
                      Metadata Properties:
                    </div>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-950 p-2 font-mono text-[10px] text-gray-400">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : selectedEdge ? (
              <div className="sticky top-8 rounded-2xl border border-indigo-500/40 bg-gray-900/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Relationship Explanation</h3>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getProvenanceBadgeClass(
                      selectedEdge.provenance,
                    )}`}
                  >
                    [{selectedEdge.provenance}]
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400">
                      Relationship Type:
                    </div>
                    <div className="font-mono text-xs font-bold text-indigo-400">
                      {selectedEdge.relationship_type}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-gray-400">
                      Rationale / Description:
                    </div>
                    <div className="mt-0.5 text-xs text-gray-200">{selectedEdge.label}</div>
                  </div>

                  {selectedEdge.evidence_references.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400">
                        Evidence References:
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedEdge.evidence_references.map((ev, i) => (
                          <span
                            key={i}
                            className="rounded border border-gray-800 bg-gray-950 px-2 py-0.5 font-mono text-[10px] text-gray-300"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() =>
                      setInspectTarget({
                        type: "health",
                        id: "overall",
                      })
                    }
                    className="mt-3 w-full rounded-lg border border-indigo-500/30 bg-indigo-600/20 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30"
                  >
                    [Why?] Inspect in Evidence Intelligence
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 text-center text-gray-500">
                <HelpCircle className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                <p className="text-xs font-medium text-gray-400">
                  Select any entity or relationship
                </p>
                <p className="mt-1 text-[11px] text-gray-600">
                  Click any File, Finding, Incident, or edge connector to inspect causal evidence
                  and connections.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EVIDENCE INSPECTOR MODAL INTEGRATION ──────────────────────────── */}
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
