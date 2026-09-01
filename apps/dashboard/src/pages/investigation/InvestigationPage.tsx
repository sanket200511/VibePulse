import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
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
  History,
  CheckSquare,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import {
  useInvestigation,
  useIncidentDetail,
  useIncidentHistory,
  useIncidentMetrics,
  useProjectHealthSummary,
  useUpdateIncidentReview,
  type EvidenceNode,
} from "./useInvestigation";
import { LoadingState } from "../../components/states";
import { getApiBaseUrl } from "../../lib/api-config";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const RESOLUTION_TEMPLATES = [
  "Secret revoked, rotated in upstream provider, and externalized to environment variable (.env).",
  "Disabled insecure debug mode in settings configuration.",
  "Restricted permissive CORS wildcard origins to trusted frontend domains.",
  "Refactored dynamic code execution to use safe static parsers.",
  "Sanitized shell command execution using parameterized subprocess.",
  "False positive confirmed through manual security review.",
];

export function InvestigationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlIncidentId =
    searchParams.get("incidentId") || searchParams.get("incident") || searchParams.get("id");
  const urlQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(urlQuery);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    urlIncidentId || null,
  );
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [targetStatus, setTargetStatus] = useState<string>("RESOLVED");

  // Keep state in sync with URL search params
  useEffect(() => {
    if (urlIncidentId && urlIncidentId !== selectedIncidentId) {
      setSelectedIncidentId(urlIncidentId);
    }
  }, [urlIncidentId, selectedIncidentId]);

  // Evidence Graph Interactive Navigation State
  const [graphZoom, setGraphZoom] = useState<number>(1);
  const [graphPan, setGraphPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { data, isLoading, isError } = useInvestigation(projectId, query);
  const rawResults = useMemo(() => data?.results || [], [data?.results]);

  // Metrics & Health Summary
  const { data: metrics } = useIncidentMetrics(projectId);
  const { data: healthSummary } = useProjectHealthSummary(projectId);

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

  // Active selected incident ID: explicit selection/URL target takes precedence
  const activeIncidentId = useMemo(() => {
    if (selectedIncidentId) return selectedIncidentId;
    if (urlIncidentId) return urlIncidentId;
    if (filteredResults.length > 0 && filteredResults[0]?.id) {
      return String(filteredResults[0].id);
    }
    if (rawResults.length > 0 && rawResults[0]?.id) {
      return String(rawResults[0].id);
    }
    return null;
  }, [selectedIncidentId, urlIncidentId, filteredResults, rawResults]);

  // Fetch detailed incident investigation & review history for active incident
  const {
    data: incidentDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useIncidentDetail(projectId, activeIncidentId);
  const { data: historyData } = useIncidentHistory(projectId, activeIncidentId);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("incidentId", id);
        return next;
      },
      { replace: true },
    );
  };

  const updateReviewMutation = useUpdateIncidentReview(projectId, activeIncidentId);

  const openStatusModal = (status: string) => {
    setTargetStatus(status);
    setResolutionModalOpen(true);
  };

  const handleConfirmStatusChange = (note?: string) => {
    updateReviewMutation.mutate({
      status: targetStatus,
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

  // Graph navigation controls
  const handleZoomIn = () => setGraphZoom((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setGraphZoom((prev) => Math.max(prev - 0.15, 0.5));
  const handleResetView = () => {
    setGraphZoom(1);
    setGraphPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - graphPan.x, y: e.clientY - graphPan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setGraphPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  if (isLoading) {
    return <LoadingState label="Reconstructing investigation intelligence..." />;
  }

  if (isError) {
    return (
      <div className="bg-background text-foreground flex flex-1 flex-col items-center justify-center p-8 text-center text-rose-400">
        <AlertCircle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-bold">Investigation Engine Error</h2>
        <p className="text-secondary-text mt-2 text-sm">
          Failed to query historical investigation telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up bg-background text-foreground flex flex-1 flex-col space-y-6 p-6 md:p-8">
      {/* ── BREADCRUMB HEADER ─────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={
              projectId
                ? [
                    { label: "Projects", to: "/projects" },
                    { label: "Project Story", to: `/projects/${projectId}` },
                    { label: "Investigation Engine" },
                  ]
                : [{ label: "Investigation Engine" }]
            }
          />
          <Link
            to={projectId ? `/projects/${projectId}` : "/projects"}
            className="text-secondary-text hover:text-primary-text inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {projectId ? "Back to Project Story" : "Back to Projects"}
          </Link>
        </div>

        <div className="border-border flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-primary-text flex items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                <ShieldAlert className="h-7 w-7 text-indigo-400" />
                Investigation Command Center 3.0
              </h1>
              <Badge
                variant="outline"
                className="border-indigo-500/40 font-mono text-xs text-indigo-300"
              >
                INCIDENT COLLABORATION & RESOLUTION
              </Badge>
            </div>
            <p className="text-secondary-text mt-1 text-xs md:text-sm">
              Unified incident reconstruction, live multi-tab collaboration, audit trail, and
              evidence-backed resolution intelligence.
            </p>
          </div>

          {/* Global Export actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("markdown")}
              disabled={!activeIncidentId}
              className="bg-card hover:bg-card-subtle border-border text-primary-text inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export Report
            </button>
            <button
              onClick={() => handleExport("ai")}
              disabled={!activeIncidentId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5" />
              Export for AI Handoff
            </button>
          </div>
        </div>
      </div>

      {/* ── METRICS & PROJECT HEALTH SUMMARY BAR ───────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              OPEN INCIDENTS
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-amber-400">
              {metrics.open_incidents}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              INVESTIGATING
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-blue-400">
              {metrics.investigating_incidents}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              RESOLVED
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-400">
              {metrics.resolved_incidents}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              RESOLUTION RATE
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-indigo-400">
              {metrics.resolution_rate_percent !== null &&
              metrics.resolution_rate_percent !== undefined
                ? `${metrics.resolution_rate_percent}%`
                : "—"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              AVG RESOLUTION TIME
            </div>
            <div className="mt-1 font-mono text-xs font-semibold text-gray-200">
              {metrics.avg_resolution_time_seconds !== null &&
              metrics.avg_resolution_time_seconds !== undefined
                ? `${Math.round(metrics.avg_resolution_time_seconds)}s`
                : "Insufficient historical data"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <HeartPulse className="h-3 w-3 text-indigo-400" />
              PROJECT POSTURE
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`font-mono text-xs font-bold ${
                  healthSummary?.security_posture === "CRITICAL"
                    ? "text-red-400"
                    : healthSummary?.security_posture === "HIGH"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                {healthSummary?.security_posture || "NORMAL"}
              </span>
              <span className="text-[10px] text-gray-500">
                · {healthSummary?.most_affected_subsystem || "Core"}
              </span>
            </div>
          </div>
        </div>
      )}

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

          {filteredResults.length === 0 && !incidentDetail ? (
            rawResults.length === 0 ? (
              <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-8 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                <h4 className="text-primary-text text-sm font-bold">No Incidents Recorded</h4>
                <p className="text-secondary-text mt-1 text-xs">
                  No security violations or structural anomalies have been detected for this
                  workspace.
                </p>
              </div>
            ) : (
              <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-8 text-center">
                <Search className="text-muted-foreground mb-2 h-8 w-8" />
                <h4 className="text-primary-text text-sm font-bold">No Matching Incidents</h4>
                <p className="text-secondary-text mt-1 text-xs">
                  No incidents match the active search query or status filter.
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("ALL");
                  }}
                  className="bg-card hover:bg-card-subtle border-border text-primary-text mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition"
                >
                  <RotateCcw className="h-3 w-3" /> Clear Filters
                </button>
              </div>
            )
          ) : (
            <>
              {/* If targeted incident is resolved or not in the filtered event list, present it at top */}
              {incidentDetail &&
                !filteredResults.some(
                  (r) =>
                    String(r.id) === String(activeIncidentId) ||
                    String(incidentDetail.incident_id) === String(r.id),
                ) && (
                  <div
                    key={String(incidentDetail.incident_id)}
                    onClick={() => handleSelectIncident(String(incidentDetail.incident_id))}
                    className="relative cursor-pointer rounded-lg border border-indigo-500 bg-gray-900 p-3.5 shadow-md shadow-indigo-950/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-xs font-bold text-gray-100">
                        {incidentDetail.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-mono text-[10px] ${
                          incidentDetail.severity === "CRITICAL"
                            ? "border-red-500/40 bg-red-950/20 text-red-400"
                            : incidentDetail.severity === "HIGH"
                              ? "border-amber-500/40 bg-amber-950/20 text-amber-400"
                              : "border-blue-500/40 text-blue-400"
                        }`}
                      >
                        {incidentDetail.severity} · {incidentDetail.risk_score}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1 font-mono text-indigo-300">
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                        TARGETED INCIDENT
                      </span>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-[9px] text-emerald-400"
                      >
                        {incidentDetail.status}
                      </Badge>
                    </div>
                  </div>
                )}

              {filteredResults.map((res) => {
                const isSelected = activeIncidentId === String(res.id);
                const sev = (res.risk_level || "LOW").toUpperCase();
                return (
                  <div
                    key={String(res.id)}
                    onClick={() => handleSelectIncident(String(res.id))}
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
              })}
            </>
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
              {/* 1. HERO INCIDENT HEADER & RESOLUTION CENTER */}
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
                        className={`font-mono text-xs ${
                          incidentDetail.status === "RESOLVED"
                            ? "border-emerald-500 bg-emerald-950/30 text-emerald-400"
                            : incidentDetail.status === "INVESTIGATING"
                              ? "border-amber-500 bg-amber-950/30 text-amber-400"
                              : "border-gray-700 text-gray-300"
                        }`}
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

                {/* RESOLUTION CENTER ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-400">Transition State:</span>
                    <button
                      onClick={() => openStatusModal("INVESTIGATING")}
                      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                        incidentDetail.status === "INVESTIGATING"
                          ? "bg-amber-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Eye className="mr-1 inline h-3 w-3" />
                      Investigate
                    </button>
                    <button
                      onClick={() => openStatusModal("REVIEWED")}
                      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                        incidentDetail.status === "REVIEWED"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Check className="mr-1 inline h-3 w-3" />
                      Reviewed
                    </button>
                    <button
                      onClick={() => openStatusModal("RESOLVED")}
                      className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                        incidentDetail.status === "RESOLVED"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                          : "border border-emerald-700/50 bg-emerald-950 text-emerald-300 hover:bg-emerald-900"
                      }`}
                    >
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      Resolve Incident
                    </button>
                  </div>

                  {incidentDetail.review_record?.resolution_note && (
                    <div className="line-clamp-1 max-w-xs text-xs italic text-emerald-400">
                      Latest Note: &ldquo;{incidentDetail.review_record.resolution_note}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* 2. RESOLUTION INTELLIGENCE & REMEDIATION CHECKLIST */}
              {incidentDetail.resolution_recommendations &&
                incidentDetail.resolution_recommendations.length > 0 && (
                  <div className="space-y-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-300">
                        <Sparkles className="h-4 w-4 text-emerald-400" />
                        Resolution Intelligence & Remediation Guidance
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 font-mono text-[10px] text-emerald-400"
                      >
                        EVIDENCE-BACKED ACTIONS
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {incidentDetail.resolution_recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="space-y-3 rounded-lg border border-emerald-900/40 bg-gray-950/80 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-100">{rec.title}</span>
                            <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                              {rec.rule_id}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300">{rec.why}</p>

                          {/* Recommended Actions */}
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                              RECOMMENDED REMEDIATION ACTIONS
                            </div>
                            {rec.recommended_actions.map((act, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex items-start gap-2 text-xs text-gray-300"
                              >
                                <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>

                          {/* Verification Steps */}
                          <div className="space-y-1.5 border-t border-gray-800/80 pt-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                              VERIFICATION CHECKLIST
                            </div>
                            {rec.verification_steps.map((ver, vIdx) => (
                              <div
                                key={vIdx}
                                className="flex items-start gap-2 text-xs text-gray-300"
                              >
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                <span>{ver}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 3. REVIEW AUDIT HISTORY TIMELINE */}
              <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                    <History className="h-4 w-4 text-indigo-400" />
                    Review Audit Trail & Transitions
                  </h3>
                  <span className="font-mono text-xs text-gray-400">
                    {historyData?.history?.length || incidentDetail.review_history?.length || 0}{" "}
                    records
                  </span>
                </div>

                {(historyData?.history || incidentDetail.review_history || []).length === 0 ? (
                  <div className="rounded border border-gray-800/60 bg-gray-950/40 p-4 text-center text-xs text-gray-400">
                    No status transitions recorded yet. Incident is in initial OPEN state.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(historyData?.history || incidentDetail.review_history || []).map((h, i) => (
                      <div
                        key={h.id || i}
                        className="flex flex-col justify-between gap-1 rounded border border-gray-800/80 bg-gray-950/80 p-3 text-xs sm:flex-row sm:items-center"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                              {h.previous_status} &rarr; {h.new_status}
                            </span>
                            <span className="font-bold text-gray-200">{h.reviewer}</span>
                          </div>
                          {h.resolution_note && (
                            <div className="text-[11px] italic text-emerald-400">
                              &ldquo;{h.resolution_note}&rdquo;
                            </div>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. INCIDENT STORY & NARRATIVE */}
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

              {/* 5. RISK EVOLUTION & ROOT CAUSE */}
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
                        {(incidentDetail.root_cause.contributing_signals || []).map((cs, i) => (
                          <li key={i}>{cs}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. AFFECTED SURFACE & ENGINEERING DNA CONTRAST */}
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

              {/* 7. EVIDENCE GRAPH 3.0 WITH NAVIGATION CONTROLS */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                      <Activity className="h-4 w-4 text-indigo-400" />
                      Evidence Graph 3.0 & Causal Topology
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Interactive pan & zoom controls. Click any node to inspect telemetry.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Zoom / Pan Navigation toolbar */}
                    <button
                      onClick={handleZoomIn}
                      className="rounded border border-gray-700 bg-gray-800 p-1.5 text-gray-300 hover:bg-gray-700"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="rounded border border-gray-700 bg-gray-800 p-1.5 text-gray-300 hover:bg-gray-700"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleResetView}
                      className="rounded border border-gray-700 bg-gray-800 p-1.5 text-gray-300 hover:bg-gray-700"
                      title="Reset View"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <Badge
                      variant="outline"
                      className="border-indigo-500/40 font-mono text-xs text-indigo-300"
                    >
                      {Math.round(graphZoom * 100)}%
                    </Badge>
                  </div>
                </div>

                {/* Graph Canvas Container */}
                <div
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="relative min-h-[160px] cursor-grab overflow-hidden rounded-lg border border-gray-800 bg-gray-950 p-4 active:cursor-grabbing"
                >
                  <div
                    style={{
                      transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                      transformOrigin: "top left",
                      transition: isPanning ? "none" : "transform 0.15s ease-out",
                    }}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
                  >
                    {incidentDetail.evidence_graph.nodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`relative cursor-pointer rounded-lg border p-3 transition ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-950/60 shadow-md"
                              : "border-gray-800 bg-gray-900/80 hover:border-gray-700"
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
            </>
          ) : activeIncidentId && (isDetailError || !incidentDetail) ? (
            <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center shadow-sm">
              <AlertCircle className="mb-3 h-10 w-10 text-amber-500" />
              <h3 className="text-primary-text text-base font-bold">Incident Not Found</h3>
              <p className="text-secondary-text mt-1.5 max-w-md text-xs leading-relaxed">
                The referenced incident &ldquo;
                <span className="font-mono text-amber-400">{activeIncidentId}</span>&rdquo; could
                not be located in this workspace&apos;s verified telemetry.
              </p>
              <button
                onClick={() => {
                  setSelectedIncidentId(null);
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete("incidentId");
                      next.delete("incident");
                      next.delete("id");
                      return next;
                    },
                    { replace: true },
                  );
                }}
                className="bg-card hover:bg-card-subtle border-border text-primary-text mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                View All Project Incidents
              </button>
            </div>
          ) : (
            <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center shadow-sm">
              <ShieldAlert className="mb-3 h-10 w-10 text-indigo-400/80" />
              <h3 className="text-primary-text text-base font-bold">Incident Command Center</h3>
              <p className="text-secondary-text mt-1.5 max-w-md text-xs leading-relaxed">
                Select an incident from the stream to inspect its deterministic causal DAG, event
                timeline, affected code symbols, and execute resolution workflows.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── RESOLUTION & REVIEW NOTE MODAL WITH TEMPLATES ──────────────────── */}
      {resolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Update Status to {targetStatus}</h3>
              <Badge variant="outline" className="border-indigo-500/40 text-xs text-indigo-300">
                AUDIT TRAIL LOGGED
              </Badge>
            </div>

            <p className="text-xs text-gray-400">
              Select a quick resolution template or enter custom audit notes documenting the action.
            </p>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                QUICK RESOLUTION TEMPLATES
              </span>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-gray-800 bg-gray-950 p-2">
                {RESOLUTION_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResolutionNote(tmpl)}
                    className="w-full rounded p-1.5 text-left text-xs text-gray-300 transition hover:bg-gray-800 hover:text-white"
                  >
                    &bull; {tmpl}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Enter resolution notes, actions taken, or triage rationale..."
              className="w-full rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolutionModalOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmStatusChange(resolutionNote)}
                className={`rounded px-4 py-1.5 text-xs font-semibold text-white shadow transition ${
                  targetStatus === "RESOLVED"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                Confirm {targetStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
