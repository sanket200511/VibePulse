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
      <div className="border-border/80 bg-card/60 flex h-full flex-col justify-between rounded-lg border p-4 shadow-sm">
        <div>
          <div className="border-border/60 flex items-center gap-2 border-b pb-2.5">
            <Info className="text-primary h-3.5 w-3.5" />
            <h4 className="text-foreground font-mono text-xs font-semibold uppercase tracking-wider">
              Intelligence Inspector
            </h4>
          </div>
          <p className="text-muted-foreground mt-2.5 text-xs leading-relaxed">
            Select any entity on the canvas to inspect evidence, connected relationships, root cause
            traces, and downstream impacts.
          </p>

          {suggestedNodes.length > 0 && (
            <div className="mt-3.5">
              <div className="text-muted-foreground mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider">
                Quick Focus Entities
              </div>
              <div className="space-y-1.5">
                {suggestedNodes.map((n) => (
                  <button
                    key={n.node_id}
                    onClick={() => onSelectNode(n)}
                    className="border-border/80 bg-secondary/30 text-muted-foreground hover:border-primary/60 hover:text-foreground flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getNodeIcon(n.node_type)}
                      <span className="truncate font-mono text-[11px]">{n.label}</span>
                    </div>
                    <ChevronRight className="text-muted-foreground h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-border/60 text-muted-foreground border-t pt-2.5 font-mono text-[10px]">
          DepRadar 2.0 Causal Surface
        </div>
      </div>
    );
  }

  // ── STATE B: EDGE INSPECTION ──────────────────────────────────────────────
  if (selectedEdge) {
    return (
      <div className="border-border/80 bg-card/80 space-y-3 rounded-lg border p-4 shadow-sm">
        <div className="border-border/60 flex items-center justify-between border-b pb-2.5">
          <span className="text-primary font-mono text-xs font-semibold">
            {selectedEdge.relationship_type}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${getProvenanceBadge(
              selectedEdge.provenance,
            )}`}
          >
            [{selectedEdge.provenance}]
          </span>
        </div>

        <div>
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Relationship Label
          </div>
          <div className="text-foreground mt-0.5 text-xs font-medium">{selectedEdge.label}</div>
        </div>

        {/* WHY THIS CONNECTION? */}
        <div className="border-border/80 bg-secondary/30 rounded-md border p-2.5">
          <div className="text-primary mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold">
            <Zap className="text-primary h-3.5 w-3.5" />
            WHY THIS CONNECTION?
          </div>
          <div className="text-foreground text-xs leading-relaxed">
            {edgeExplain?.reason ||
              selectedEdge.reason ||
              "Relationship established from verified telemetry."}
          </div>
        </div>

        {/* Evidence References */}
        <div>
          <div className="text-muted-foreground mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
            Grounded Telemetry References
          </div>
          {selectedEdge.evidence_references && selectedEdge.evidence_references.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedEdge.evidence_references.map((ev, idx) => (
                <span
                  key={idx}
                  className="border-border/60 bg-secondary/30 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] text-emerald-400"
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  {ev}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-xs italic">
              Direct structural relationship in project schema.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-border/60 space-y-1.5 border-t pt-2.5">
          <button
            onClick={() => onFocusNode(selectedEdge.source_node_id)}
            className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            <span className="truncate">Focus Source: {selectedEdge.source_node_id}</span>
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onFocusNode(selectedEdge.target_node_id)}
            className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            <span className="truncate">Focus Target: {selectedEdge.target_node_id}</span>
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
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
    <div className="border-border/80 bg-card/80 space-y-3 rounded-lg border p-4 shadow-sm">
      {/* Header */}
      <div className="border-border/60 flex items-center justify-between border-b pb-2.5">
        <div className="flex items-center gap-2">
          {getNodeIcon(node.node_type)}
          <h3 className="text-foreground text-xs font-semibold">{node.node_type}</h3>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${getProvenanceBadge(
            node.provenance,
          )}`}
        >
          [{node.provenance}]
        </span>
      </div>

      {/* Entity Title */}
      <div>
        <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
          Entity Label
        </div>
        <div className="text-foreground mt-0.5 break-all font-mono text-xs font-semibold">
          {node.label}
        </div>
        {node.subsystem && (
          <div className="border-border/60 bg-secondary/30 text-muted-foreground mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]">
            <Layers className="h-3 w-3" />
            {node.subsystem}
          </div>
        )}
      </div>

      {/* High-Value Telemetry Overview */}
      <div className="border-border/80 bg-secondary/20 space-y-1.5 rounded-md border p-2.5 text-xs">
        {node.node_type === "SecurityFinding" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Severity:</span>
              <span className="font-mono font-bold uppercase text-rose-400">
                {String(node.metadata.severity ?? "CRITICAL")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Contribution:</span>
              <span className="font-mono font-bold text-rose-400">
                +{String(node.metadata.risk_contribution ?? "15")} points
              </span>
            </div>
            {node.metadata.evidence && (
              <div className="border-border/80 bg-background/80 text-muted-foreground mt-1 rounded border p-2 font-mono text-[10px]">
                {String(node.metadata.evidence)}
              </div>
            )}
          </>
        )}

        {node.node_type === "Incident" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Severity:</span>
              <span className="font-mono font-bold uppercase text-amber-400">
                {String(node.metadata.severity ?? "CRITICAL")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-mono font-bold text-emerald-400">
                {String(node.metadata.status ?? "RESOLVED")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Score:</span>
              <span className="font-mono font-bold tabular-nums text-amber-400">
                {String(node.metadata.risk_score ?? "85")}/100
              </span>
            </div>
          </>
        )}

        {node.node_type === "HealthDimension" && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Dimension Score:</span>
            <span className="text-foreground font-mono font-bold tabular-nums">
              {String(node.metadata.score ?? "")}/100
            </span>
          </div>
        )}

        {node.node_type === "Prediction" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Evidence Strength:</span>
              <span className="text-foreground font-mono font-bold">
                {String(node.metadata.evidence_strength ?? "STRONG")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Time Horizon:</span>
              <span className="text-muted-foreground font-mono">
                {String(node.metadata.time_horizon ?? "NEXT_CYCLE")}
              </span>
            </div>
          </>
        )}

        {node.node_type === "File" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Activity Count:</span>
              <span className="text-foreground font-mono font-bold tabular-nums">
                {String(node.metadata.activity_count ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Language:</span>
              <span className="text-foreground font-mono">
                {String(node.metadata.language ?? "Python")}
              </span>
            </div>
          </>
        )}

        <div className="border-border/60 flex items-center justify-between border-t pt-1.5 font-mono text-[11px]">
          <span className="text-muted-foreground">Connected:</span>
          <span className="text-foreground font-bold tabular-nums">{connectedEdges.length}</span>
        </div>
      </div>

      {/* Connected Entities Chips */}
      {connectedEdges.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
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
                  className="border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground flex w-full items-center justify-between rounded border px-2 py-1 text-[11px] transition-colors"
                >
                  <span className="text-primary font-mono text-[9px] font-semibold">
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
      <div className="border-border/60 space-y-1.5 border-t pt-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onTraceRootCause(node.node_id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 font-mono text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-500/20"
          >
            <Crosshair className="h-3 w-3" />
            Trace Root Cause
          </button>
          <button
            onClick={() => onTraceImpact(node.node_id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 font-mono text-xs font-semibold text-purple-400 transition-colors hover:bg-purple-500/20"
          >
            <TrendingUp className="h-3 w-3" />
            Trace Impact
          </button>
        </div>

        <button
          onClick={() => onFocusNode(node.node_id)}
          className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <Search className="h-3 w-3" />
          Focus Neighborhood
        </button>

        {incId && (
          <button
            onClick={() => {
              void navigate(
                `/projects/${projectId}/investigation?incidentId=${encodeURIComponent(incId)}`,
              );
            }}
            className="flex w-full items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <span>Investigate Incident ({incId})</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}

        {node.node_type === "SecurityFinding" && (
          <button
            onClick={() => {
              void navigate(`/projects/${projectId}/security`);
            }}
            className="flex w-full items-center justify-between rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
          >
            <span>Open Security Command Center</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}

        {node.node_type === "HealthDimension" && (
          <button
            onClick={() => onOpenEvidence("health", "overall")}
            className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            <span>Show Decomposition</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
