import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Search,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  TrendingUp,
  Download,
  Share2,
  Eye,
  Check,
  Compass,
  Cpu,
  Layers,
  Activity,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import {
  useInvestigation,
  useIncidentDetail,
  useUpdateIncidentReview,
  type EvidenceNode,
} from "./useInvestigation";
import { LoadingState } from "../../components/states";
import { getApiBaseUrl } from "../../lib/api-config";

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function InvestigationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  const { data, isLoading, isError } = useInvestigation(projectId, query);
  const rawResults = useMemo(() => data?.results || [], [data?.results]);

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let list = rawResults;
    if (statusFilter !== "ALL") {
      list = list.filter((r) => (r.status || "OPEN").toUpperCase() === statusFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.summary.toLowerCase().includes(q) ||
          (r.file_path || "").toLowerCase().includes(q) ||
          (r.project_name || "").toLowerCase().includes(q) ||
          (r.risk_level || "").toLowerCase().includes(q) ||
          r.security_findings?.some(
            (f) => f.message.toLowerCase().includes(q) || f.rule_id.toLowerCase().includes(q),
          ),
      );
    }
    return [...list].sort((a, b) => {
      const rankA = SEVERITY_RANK[(a.risk_level || "LOW").toUpperCase()] ?? 4;
      const rankB = SEVERITY_RANK[(b.risk_level || "LOW").toUpperCase()] ?? 4;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [rawResults, query, statusFilter]);

  // Active selected incident ID
  const activeIncidentId = useMemo(() => {
    if (selectedIncidentId) return selectedIncidentId;
    if (filteredResults.length > 0 && filteredResults[0]?.id) {
      return String(filteredResults[0].id);
    }
    return null;
  }, [selectedIncidentId, filteredResults]);

  // Fetch detailed incident investigation for active incident
  const { data: incidentDetail, isLoading: isDetailLoading } = useIncidentDetail(
    projectId,
    activeIncidentId,
  );

  const updateReviewMutation = useUpdateIncidentReview(projectId, activeIncidentId);

  const handleStatusChange = (newStatus: string, note?: string) => {
    if (newStatus === "RESOLVED" && !note && !resolutionModalOpen) {
      setResolutionModalOpen(true);
      return;
    }
    updateReviewMutation.mutate({
      status: newStatus,
      reviewed_by: "Security Engineer",
      resolution_note: note || resolutionNote || undefined,
    });
    setResolutionModalOpen(false);
    setResolutionNote("");
  };

  const handleExport = (format: "markdown" | "json" | "ai") => {
    if (!projectId || !activeIncidentId) return;
    let url = "";
    if (format === "ai") {
      url = `${getApiBaseUrl()}/api/projects/${projectId}/investigations/${activeIncidentId}/ai-handoff`;
    } else {
      url = `${getApiBaseUrl()}/api/projects/${projectId}/investigations/${activeIncidentId}/export?format=${format}`;
    }
    window.open(url, "_blank");
  };

  if (isLoading) {
    return <LoadingState label="Reconstructing investigation intelligence..." />;
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-400">
        <AlertCircle className="mx-auto mb-4 h-12 w-12" />
        <h2 className="text-xl font-bold">Investigation Engine Error</h2>
        <p className="mt-2 text-sm text-gray-400">
          Failed to query historical investigation telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-[#0d1117] p-6 text-gray-100">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
              <ShieldAlert className="h-7 w-7 text-indigo-400" />
              Investigation Command Center 3.0
            </h1>
            <Badge
              variant="outline"
              className="border-indigo-500/40 font-mono text-xs text-indigo-300"
            >
              UNIFIED INCIDENT INTELLIGENCE
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Deterministic incident reconstruction orchestrating Telemetry, Engineering DNA, and
            Security Posture.
          </p>
        </div>

        {/* Global Export actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("markdown")}
            disabled={!activeIncidentId}
            className="flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-gray-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export Report
          </button>
          <button
            onClick={() => handleExport("ai")}
            disabled={!activeIncidentId}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Share2 className="h-3.5 w-3.5" />
            Export for AI Handoff
          </button>
        </div>
      </div>

      {/* ── FILTER & STATUS TABS ────────────────────────────────────────────── */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 rounded-md border border-gray-800 bg-gray-950 p-1">
          {["ALL", "OPEN", "INVESTIGATING", "REVIEWED", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter incidents by symbol, file, rule, or severity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-gray-800 bg-gray-950 py-1.5 pl-9 pr-4 text-xs text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── SPLIT WORKSPACE: INCIDENTS LIST + COMMAND CENTER ────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Incidents Stream */}
        <div className="space-y-3 lg:col-span-4">
          <div className="flex items-center justify-between px-1 text-xs font-bold text-gray-400">
            <span>CORRELATED INCIDENTS ({filteredResults.length})</span>
            <span>SEVERITY SORTED</span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center text-xs text-gray-400">
              No incidents match the active search filter.
            </div>
          ) : (
            filteredResults.map((res) => {
              const isSelected = activeIncidentId === String(res.id);
              const sev = (res.risk_level || "LOW").toUpperCase();
              return (
                <div
                  key={String(res.id)}
                  onClick={() => setSelectedIncidentId(String(res.id))}
                  className={`relative cursor-pointer rounded-lg border p-3.5 transition ${
                    isSelected
                      ? "border-indigo-500 bg-gray-900 shadow-md shadow-indigo-950/40"
                      : "border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-xs font-bold text-gray-100">
                      {res.summary}
                    </span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 font-mono text-[10px] ${
                        sev === "CRITICAL"
                          ? "border-red-500/40 bg-red-950/20 text-red-400"
                          : sev === "HIGH"
                            ? "border-amber-500/40 bg-amber-950/20 text-amber-400"
                            : "border-blue-500/40 text-blue-400"
                      }`}
                    >
                      {sev} · {res.risk_score}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-gray-500" />
                      {new Date(res.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    {res.file_name && (
                      <span className="flex items-center gap-1 truncate text-gray-300">
                        <FileCode className="h-3 w-3 shrink-0 text-gray-500" />
                        {res.file_name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Incident Command Center */}
        <div className="space-y-6 lg:col-span-8">
          {isDetailLoading ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-12 text-center">
              <LoadingState label="Synthesizing unified incident story..." />
            </div>
          ) : incidentDetail ? (
            <>
              {/* 1. HERO INCIDENT HEADER */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/30 p-5 shadow-xl">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs font-black ${
                          incidentDetail.severity === "CRITICAL"
                            ? "border-red-500 bg-red-950/30 text-red-400"
                            : incidentDetail.severity === "HIGH"
                              ? "border-amber-500 bg-amber-950/30 text-amber-400"
                              : "border-blue-500 text-blue-400"
                        }`}
                      >
                        {incidentDetail.severity} SEVERITY
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-gray-700 font-mono text-xs text-gray-300"
                      >
                        STATUS: {incidentDetail.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-[10px] text-emerald-400"
                      >
                        {incidentDetail.confidence} PROVENANCE
                      </Badge>
                    </div>
                    <h2 className="mt-1.5 text-xl font-bold text-white">{incidentDetail.title}</h2>
                  </div>

                  {/* Risk Score Gauge */}
                  <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/80 px-4 py-2">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        COMPOSITE RISK
                      </div>
                      <div className="font-mono text-xs text-gray-500">Additive Model</div>
                    </div>
                    <div className="font-mono text-2xl font-black text-indigo-400">
                      {incidentDetail.risk_score}
                      <span className="text-xs text-gray-500">/100</span>
                    </div>
                  </div>
                </div>

                {/* Review Workflow Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-400">Lifecycle Actions:</span>
                    <button
                      onClick={() => handleStatusChange("INVESTIGATING")}
                      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                        incidentDetail.status === "INVESTIGATING"
                          ? "bg-amber-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Eye className="mr-1 inline h-3 w-3" />
                      Start Investigation
                    </button>
                    <button
                      onClick={() => handleStatusChange("REVIEWED")}
                      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                        incidentDetail.status === "REVIEWED"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Check className="mr-1 inline h-3 w-3" />
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleStatusChange("RESOLVED")}
                      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                        incidentDetail.status === "RESOLVED"
                          ? "bg-emerald-600 text-white"
                          : "border border-emerald-700/50 bg-emerald-950 text-emerald-300 hover:bg-emerald-900"
                      }`}
                    >
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      Resolve Incident
                    </button>
                  </div>

                  {incidentDetail.review_record?.resolution_note && (
                    <div className="line-clamp-1 max-w-xs text-xs italic text-emerald-400">
                      Note: &ldquo;{incidentDetail.review_record.resolution_note}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* 2. INCIDENT STORY & NARRATIVE */}
              <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                    <Compass className="h-4 w-4 text-indigo-400" />
                    Deterministic Incident Narrative
                  </h3>
                  <Badge variant="outline" className="border-gray-700 text-[10px] text-gray-400">
                    FACTS-DERIVED STORY
                  </Badge>
                </div>
                <div className="space-y-2 font-sans text-xs leading-relaxed text-gray-300">
                  {incidentDetail.story.narrative_paragraphs.map((para, i) => (
                    <p key={i} className="rounded border border-gray-800/60 bg-gray-950/40 p-2.5">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* 3. RISK EVOLUTION & ROOT CAUSE */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Risk Evolution */}
                <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                    Risk Evolution Progression
                  </h3>
                  <div className="space-y-2">
                    {incidentDetail.risk_evolution.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded border border-gray-800/60 bg-gray-950/60 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                            {step.category}
                          </span>
                          <span className="max-w-[160px] truncate text-xs text-gray-300">
                            {step.factor}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 font-mono">
                          {step.points_added > 0 && (
                            <span className="text-xs text-amber-400">+{step.points_added}</span>
                          )}
                          <span className="text-xs font-bold text-indigo-400">
                            ={step.running_score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Root Cause Analysis */}
                <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                    <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                    Root Cause & Signals
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="rounded border border-red-900/40 bg-red-950/20 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                        PRIMARY SIGNAL
                      </div>
                      <div className="mt-0.5 font-semibold text-gray-200">
                        {incidentDetail.root_cause.primary_signal}
                      </div>
                    </div>
                    <div className="rounded border border-gray-800 bg-gray-950 p-2.5">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        CONTRIBUTING SIGNALS
                      </div>
                      <ul className="list-inside list-disc space-y-1 text-[11px] text-gray-300">
                        {incidentDetail.root_cause.contributing_signals.map((cs, i) => (
                          <li key={i}>{cs}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. AFFECTED SURFACE & ENGINEERING DNA CONTRAST */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Affected Surface */}
                <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    Affected Surface & Subsystems
                  </h3>
                  <div className="space-y-2">
                    {incidentDetail.affected_surface.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2 text-xs"
                      >
                        <span className="font-semibold text-gray-200">{item.subsystem}</span>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>{item.file_count} file(s)</span>
                          {item.findings_count > 0 && (
                            <span className="font-mono font-bold text-red-400">
                              ({item.findings_count} findings)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engineering DNA Contrast */}
                <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                    <Compass className="h-3.5 w-3.5 text-indigo-400" />
                    Engineering DNA Contrast
                  </h3>
                  <div className="space-y-2 rounded border border-gray-800 bg-gray-950 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Normal Focus:</span>
                      <span className="font-mono text-indigo-300">
                        {incidentDetail.engineering_dna.normal_focus_dirs.join(", ") ||
                          "General Code"}
                      </span>
                    </div>
                    <div className="border-t border-gray-800/80 pt-1 text-[11px] leading-relaxed text-gray-300">
                      {incidentDetail.engineering_dna.analysis_summary}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. EVIDENCE GRAPH 3.0 & NODE INSPECTOR */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                      <Activity className="h-4 w-4 text-indigo-400" />
                      Evidence Graph 3.0 & Causal Topology
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Click any node to inspect telemetry and provenance.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-indigo-500/40 font-mono text-xs text-indigo-300"
                  >
                    {incidentDetail.evidence_graph.nodes.length} NODES ·{" "}
                    {incidentDetail.evidence_graph.edges.length} EDGES
                  </Badge>
                </div>

                {/* Interactive Node Flow View */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {incidentDetail.evidence_graph.nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`relative cursor-pointer rounded-lg border p-3 transition ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-950/60 shadow-md"
                            : "border-gray-800 bg-gray-950 hover:border-gray-700"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-gray-400">
                          <span>
                            #{node.step_number} {node.kind}
                          </span>
                          {node.severity && (
                            <span className="font-bold text-amber-400">{node.severity}</span>
                          )}
                        </div>
                        <div className="line-clamp-1 text-xs font-bold text-gray-200">
                          {node.title}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
                          {node.subtitle}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Node Inspector Drawer */}
                {selectedNode && (
                  <div className="space-y-2 rounded-lg border border-indigo-500/50 bg-gray-950 p-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                        NODE INSPECTOR: {selectedNode.title}
                      </div>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs sm:grid-cols-3">
                      <div>
                        <span className="block text-[10px] text-gray-500">TIMESTAMP</span>
                        <span className="font-mono text-gray-200">
                          {new Date(selectedNode.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500">CATEGORY</span>
                        <span className="font-mono text-gray-200">{selectedNode.kind}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500">PROVENANCE</span>
                        <span className="font-mono text-emerald-400">
                          {selectedNode.provenance || "OBSERVED"}
                        </span>
                      </div>
                    </div>
                    {selectedNode.details && (
                      <div className="max-h-32 overflow-y-auto rounded border border-gray-800 bg-gray-900 p-2 pt-2 font-mono text-xs text-gray-300">
                        <pre className="whitespace-pre-wrap text-[11px]">
                          {JSON.stringify(selectedNode.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. REMEDIATION PLAN */}
              <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Prescribed Remediation Steps
                </h3>
                <p className="text-xs italic text-gray-300">
                  {incidentDetail.remediation_guidance}
                </p>
                <div className="space-y-1.5 pt-1">
                  {incidentDetail.remediation_steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded border border-gray-800 bg-gray-950 p-2.5 text-xs text-gray-200"
                    >
                      <span className="font-mono font-bold text-indigo-400">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-12 text-center text-xs text-gray-400">
              Select an incident from the stream to view its complete investigation.
            </div>
          )}
        </div>
      </div>

      {/* ── RESOLUTION NOTE MODAL ────────────────────────────────────────────── */}
      {resolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">Resolve Incident</h3>
            <p className="text-xs text-gray-400">
              Please enter a resolution note documenting how this security or code incident was
              resolved.
            </p>
            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Credential revoked, rotated, and moved to environment configuration."
              className="w-full rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-xs text-gray-200 focus:border-emerald-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolutionModalOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange("RESOLVED", resolutionNote)}
                className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-emerald-500"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
