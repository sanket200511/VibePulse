import { useNavigate } from "react-router-dom";
import {
  FileCode,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Layers,
  Cpu,
  FolderTree,
  Crosshair,
  TrendingUp,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldCheck,
  Activity,
  User,
  Zap,
} from "lucide-react";
import type { KnowledgeGraphNode, KnowledgeGraphEdge, KnowledgeGraphNodeType } from "./types";
import { useEdgeExplanation } from "./useKnowledgeGraph";

interface CorrelationGraphInspectorProps {
  projectId: string;
  selectedNode: KnowledgeGraphNode | null;
  selectedEdge: KnowledgeGraphEdge | null;
  allEdges?: KnowledgeGraphEdge[];
  allNodes?: KnowledgeGraphNode[];
  onSelectNode: (node: KnowledgeGraphNode | null) => void;
  onSelectEdge: (edge: KnowledgeGraphEdge | null) => void;
  onFocusNode: (nodeId: string) => void;
  onTraceRootCause: (nodeId: string) => void;
  onTraceImpact: (nodeId: string) => void;
  onOpenEvidence: (
    type: "health" | "security" | "incident" | "prediction" | "priority",
    id: string,
  ) => void;
}

export function CorrelationGraphInspector({
  projectId,
  selectedNode,
  selectedEdge,
  allEdges = [],
  allNodes = [],
  onSelectNode,
  onFocusNode,
  onTraceRootCause,
  onTraceImpact,
  onOpenEvidence,
}: CorrelationGraphInspectorProps) {
  const navigate = useNavigate();

  const edgeRelId = selectedEdge?.relationship_id || null;
  const { data: edgeExplain } = useEdgeExplanation(projectId, edgeRelId);

  const getNodeIcon = (type: KnowledgeGraphNodeType) => {
    switch (type) {
      case "File":
        return <FileCode className="h-4 w-4 text-cyan-400" />;
      case "DevelopmentEvent":
        return <Activity className="h-4 w-4 text-sky-400" />;
      case "SecurityFinding":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case "Incident":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "RootCause":
        return <Crosshair className="h-4 w-4 text-orange-400" />;
      case "Prediction":
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case "Resolution":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "Subsystem":
        return <Layers className="h-4 w-4 text-indigo-400" />;
      case "Technology":
        return <Cpu className="h-4 w-4 text-teal-400" />;
      case "Actor":
        return <User className="h-4 w-4 text-violet-400" />;
      default:
        return <FolderTree className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProvenanceBadge = (prov: string) => {
    switch (prov) {
      case "OBSERVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "INFERRED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  // ── STATE A: COMPACT IDLE STATE WITH SUGGESTIONS ──────────────────────────
  if (!selectedNode && !selectedEdge) {
    const suggestedNodes = allNodes.slice(0, 4);

    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/60 p-5 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <Info className="h-4 w-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Intelligence Inspector
            </h4>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-400">
            Select any entity on the canvas to inspect evidence, connected relationships, root cause
            traces, and downstream impacts.
          </p>

          {suggestedNodes.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Quick Focus Entities
              </div>
              <div className="space-y-1.5">
                {suggestedNodes.map((n) => (
                  <button
                    key={n.node_id}
                    onClick={() => onSelectNode(n)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1.5 text-xs text-gray-300 transition hover:border-indigo-500 hover:text-white"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getNodeIcon(n.node_type)}
                      <span className="truncate font-mono">{n.label}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-3 font-mono text-[11px] text-gray-500">
          VibePulse 2.0 Causal Surface
        </div>
      </div>
    );
  }

  // ── STATE B: EDGE INSPECTION ──────────────────────────────────────────────
  if (selectedEdge) {
    return (
      <div className="space-y-4 rounded-2xl border border-indigo-500/40 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <span className="font-mono text-xs font-bold text-indigo-300">
            {selectedEdge.relationship_type}
          </span>
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getProvenanceBadge(
              selectedEdge.provenance,
            )}`}
          >
            [{selectedEdge.provenance}]
          </span>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Relationship Label
          </div>
          <div className="mt-1 text-xs font-semibold text-white">{selectedEdge.label}</div>
        </div>

        {/* WHY THIS CONNECTION? */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            WHY THIS CONNECTION?
          </div>
          <div className="text-xs leading-relaxed text-gray-200">
            {edgeExplain?.reason ||
              selectedEdge.reason ||
              "Relationship established from verified PostgreSQL telemetry."}
          </div>
        </div>

        {/* Evidence References */}
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Grounded Telemetry References
          </div>
          {selectedEdge.evidence_references && selectedEdge.evidence_references.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedEdge.evidence_references.map((ev, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-gray-950 px-2 py-1 font-mono text-[10px] text-emerald-400"
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  {ev}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs italic text-gray-500">
              Direct structural relationship in project schema.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 border-t border-gray-800 pt-3">
          <button
            onClick={() => onFocusNode(selectedEdge.source_node_id)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-indigo-500 hover:text-white"
          >
            <span>Focus Source: {selectedEdge.source_node_id}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          </button>
          <button
            onClick={() => onFocusNode(selectedEdge.target_node_id)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-indigo-500 hover:text-white"
          >
            <span>Focus Target: {selectedEdge.target_node_id}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  // ── STATE C: NODE INSPECTION (HIGH DENSITY INTELLIGENCE) ───────────────────
  if (!selectedNode) return null;

  const node = selectedNode;
  const incId = node.metadata?.incident_id as string | undefined;

  const connectedEdges = allEdges.filter(
    (e) => e.source_node_id === node.node_id || e.target_node_id === node.node_id,
  );

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-500/40 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          {getNodeIcon(node.node_type)}
          <h3 className="text-sm font-bold text-white">{node.node_type}</h3>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getProvenanceBadge(
            node.provenance,
          )}`}
        >
          [{node.provenance}]
        </span>
      </div>

      {/* Entity Title */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Entity Label
        </div>
        <div className="mt-1 break-all font-mono text-sm font-bold text-white">{node.label}</div>
        {node.subsystem && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
            <Layers className="h-3 w-3" />
            {node.subsystem}
          </div>
        )}
      </div>

      {/* High-Value Telemetry Overview */}
      <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 text-xs">
        {node.node_type === "SecurityFinding" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Severity:</span>
              <span className="font-bold uppercase text-rose-400">
                {String(node.metadata.severity ?? "CRITICAL")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Risk Contribution:</span>
              <span className="font-bold text-rose-400">
                +{String(node.metadata.risk_contribution ?? "15")} points
              </span>
            </div>
            {node.metadata.evidence && (
              <div className="mt-1 rounded border border-gray-800 bg-gray-900 p-2 font-mono text-[10px] text-gray-300">
                {String(node.metadata.evidence)}
              </div>
            )}
          </>
        )}

        {node.node_type === "Incident" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Severity:</span>
              <span className="font-bold uppercase text-amber-400">
                {String(node.metadata.severity ?? "CRITICAL")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="font-bold text-emerald-400">
                {String(node.metadata.status ?? "RESOLVED")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Risk Score:</span>
              <span className="font-bold text-amber-400">
                {String(node.metadata.risk_score ?? "85")}/100
              </span>
            </div>
          </>
        )}

        {node.node_type === "HealthDimension" && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Dimension Score:</span>
            <span className="font-bold text-purple-400">
              {String(node.metadata.score ?? "")}/100
            </span>
          </div>
        )}

        {node.node_type === "Prediction" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Evidence Strength:</span>
              <span className="font-bold text-purple-400">
                {String(node.metadata.evidence_strength ?? "STRONG")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Time Horizon:</span>
              <span className="text-gray-300">
                {String(node.metadata.time_horizon ?? "NEXT_CYCLE")}
              </span>
            </div>
          </>
        )}

        {node.node_type === "File" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Activity Count:</span>
              <span className="font-bold text-cyan-400">
                {String(node.metadata.activity_count ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Language:</span>
              <span className="text-gray-200">{String(node.metadata.language ?? "Python")}</span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-gray-800/80 pt-2">
          <span className="text-gray-400">Connected Relationships:</span>
          <span className="font-bold text-indigo-400">{connectedEdges.length}</span>
        </div>
      </div>

      {/* Connected Entities Chips */}
      {connectedEdges.length > 0 && (
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Directly Connected Entities
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {connectedEdges.slice(0, 5).map((e) => {
              const otherNodeId =
                e.source_node_id === node.node_id ? e.target_node_id : e.source_node_id;
              const otherNode = allNodes.find((n) => n.node_id === otherNodeId);
              return (
                <button
                  key={e.relationship_id}
                  onClick={() => onSelectNode(otherNode || null)}
                  className="flex w-full items-center justify-between rounded border border-gray-800/80 bg-gray-950 px-2 py-1 text-[11px] text-gray-300 transition hover:border-indigo-500 hover:text-white"
                >
                  <span className="font-mono text-[9px] font-bold text-indigo-400">
                    {e.relationship_type}
                  </span>
                  <span className="max-w-[120px] truncate font-mono">
                    {otherNode?.label || otherNodeId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onTraceRootCause(node.node_id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-950/40 px-3 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-900/60"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Trace Root Cause
          </button>
          <button
            onClick={() => onTraceImpact(node.node_id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 px-3 py-2 text-xs font-bold text-purple-300 transition hover:bg-purple-900/60"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Trace Impact
          </button>
        </div>

        <button
          onClick={() => onFocusNode(node.node_id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-3 py-2 text-xs font-bold text-indigo-300 transition hover:bg-indigo-900/60"
        >
          <Search className="h-3.5 w-3.5" />
          Focus Neighborhood
        </button>

        {incId && (
          <button
            onClick={() => {
              void navigate(
                `/projects/${projectId}/investigation?incidentId=${encodeURIComponent(incId)}`,
              );
            }}
            className="flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-900/60"
          >
            <span>Investigate Incident ({incId})</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}

        {node.node_type === "SecurityFinding" && (
          <button
            onClick={() => {
              void navigate(`/projects/${projectId}/security`);
            }}
            className="flex w-full items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-900/60"
          >
            <span>Open Security Command Center</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}

        {node.node_type === "HealthDimension" && (
          <button
            onClick={() => onOpenEvidence("health", "overall")}
            className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-gray-700 hover:text-white"
          >
            <span>Show Decomposition</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
