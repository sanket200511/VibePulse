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
import { Badge } from "@depradar/ui";
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
    <div className="animate-fade-in-up mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 md:py-6">
      {/* ── BREADCRUMB HEADER ─────────────────────────────────────────────────── */}
      <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {projectId ? "Back to Project Story" : "Back to Projects"}
          </Link>
        </div>

        <div className="border-border/60 flex flex-col justify-between gap-3 border-t pt-3 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-foreground flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
                <ShieldAlert className="text-primary h-5 w-5" />
                Investigation Command Center 3.0
              </h1>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary font-mono text-[9px] font-semibold uppercase tracking-wider"
              >
                INCIDENT COLLABORATION & RESOLUTION
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Unified incident reconstruction, live multi-tab collaboration, audit trail, and
              evidence-backed resolution intelligence.
            </p>
          </div>

          {/* Global Export actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("markdown")}
              disabled={!activeIncidentId}
              className="border-border/80 bg-secondary/40 text-foreground shadow-xs hover:bg-secondary inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export Report
            </button>
            <button
              onClick={() => handleExport("ai")}
              disabled={!activeIncidentId}
              className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors disabled:opacity-50"
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
          <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-3">
            <div className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              OPEN INCIDENTS
            </div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-amber-500">
              {metrics.open_incidents}
            </div>
          </div>
          <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-3">
            <div className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              INVESTIGATING
            </div>
            <div className="text-primary mt-1 font-mono text-xl font-bold tabular-nums">
              {metrics.investigating_incidents}
            </div>
          </div>
          <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-3">
            <div className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              RESOLVED
            </div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-400">
              {metrics.resolved_incidents}
            </div>
          </div>
          <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-3">
            <div className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              RESOLUTION RATE
            </div>
            <div className="text-primary mt-1 font-mono text-xl font-bold tabular-nums">
              {metrics.resolution_rate_percent !== null &&
              metrics.resolution_rate_percent !== undefined
                ? `${metrics.resolution_rate_percent}%`
                : "—"}
            </div>
          </div>
          <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-3">
            <div className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              AVG RESOLUTION TIME
            </div>
            <div className="text-foreground mt-1 font-mono text-xs font-semibold">
              {metrics.avg_resolution_time_seconds !== null &&
              metrics.avg_resolution_time_seconds !== undefined
                ? `${Math.round(metrics.avg_resolution_time_seconds)}s`
                : "Insufficient historical data"}
            </div>
          </div>
          <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-3">
            <div className="text-muted-foreground flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider">
              <HeartPulse className="text-primary h-3 w-3" />
              PROJECT POSTURE
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`font-mono text-xs font-bold ${
                  healthSummary?.security_posture === "CRITICAL"
                    ? "text-destructive"
                    : healthSummary?.security_posture === "HIGH"
                      ? "text-amber-500"
                      : healthSummary?.security_posture === "ELEVATED"
                        ? "text-amber-400"
                        : "text-emerald-400"
                }`}
              >
                · {healthSummary?.most_affected_subsystem || "Core"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER & STATUS TABS ────────────────────────────────────────────── */}
      <div className="border-border/80 bg-card/60 shadow-xs flex flex-col items-stretch justify-between gap-2.5 rounded-lg border p-2.5 sm:flex-row sm:items-center">
        <div className="border-border/70 bg-secondary/30 flex items-center gap-1 rounded-md border p-0.5">
          {["ALL", "OPEN", "INVESTIGATING", "REVIEWED", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter incidents by symbol, file, rule, or severity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-border/80 bg-secondary/20 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden w-full rounded-md border py-1.5 pl-8 pr-3 font-mono text-xs"
          />
        </div>
      </div>

      {/* ── SPLIT WORKSPACE: INCIDENTS LIST + COMMAND CENTER ────────────────── */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* Left Column: Incidents Stream */}
        <div className="space-y-2.5 lg:col-span-4">
          <div className="text-muted-foreground flex items-center justify-between px-1 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span>CORRELATED INCIDENTS ({filteredResults.length})</span>
            <span>SEVERITY SORTED</span>
          </div>

          {filteredResults.length === 0 && !incidentDetail ? (
            rawResults.length === 0 ? (
              <div className="border-border/80 bg-card/60 shadow-xs flex flex-col items-center justify-center rounded-lg border p-6 text-center">
                <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-400" />
                <h4 className="text-foreground text-xs font-semibold">No Incidents Recorded</h4>
                <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                  No security violations or structural anomalies have been detected for this
                  workspace.
                </p>
              </div>
            ) : (
              <div className="border-border/80 bg-card/60 shadow-xs flex flex-col items-center justify-center rounded-lg border p-6 text-center">
                <Search className="text-muted-foreground mb-2 h-6 w-6" />
                <h4 className="text-foreground text-xs font-semibold">No Matching Incidents</h4>
                <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                  No incidents match the active search query or status filter.
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("ALL");
                  }}
                  className="border-border/80 bg-secondary/40 text-foreground shadow-xs hover:bg-secondary mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
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
                    className="border-primary/50 bg-card/90 shadow-xs relative cursor-pointer rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-foreground line-clamp-1 text-xs font-semibold">
                        {incidentDetail.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-mono text-[9px] ${
                          incidentDetail.severity === "CRITICAL"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : incidentDetail.severity === "HIGH"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                              : "border-primary/40 bg-primary/10 text-primary"
                        }`}
                      >
                        {incidentDetail.severity} · {incidentDetail.risk_score}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-primary flex items-center gap-1">
                        <Sparkles className="text-primary h-3 w-3" />
                        TARGETED INCIDENT
                      </span>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-[9px] text-emerald-400"
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
                    className={`shadow-xs relative cursor-pointer rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-primary/60 bg-card/90"
                        : "border-border/70 bg-card/50 hover:border-border hover:bg-card/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-foreground line-clamp-1 text-xs font-semibold">
                        {res.summary}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-mono text-[9px] ${
                          sev === "CRITICAL"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : sev === "HIGH"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                              : "border-primary/40 bg-primary/10 text-primary"
                        }`}
                      >
                        {sev} · {res.risk_score}
                      </Badge>
                    </div>

                    <div className="text-muted-foreground mt-2 flex items-center gap-3 font-mono text-[10px]">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {new Date(res.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      {res.file_name && (
                        <span className="text-foreground/80 flex items-center gap-1 truncate">
                          <FileCode className="h-3 w-3 shrink-0" />
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
        <div className="space-y-4 lg:col-span-8">
          {isDetailLoading ? (
            <div className="border-border/80 bg-card/60 shadow-xs rounded-lg border p-8 text-center">
              <LoadingState label="Synthesizing unified incident story..." />
            </div>
          ) : incidentDetail ? (
            <>
              {/* 1. HERO INCIDENT HEADER & RESOLUTION CENTER */}
              <div className="border-border/80 bg-card/60 shadow-xs space-y-3.5 rounded-lg border p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] font-bold ${
                          incidentDetail.severity === "CRITICAL"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : incidentDetail.severity === "HIGH"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                              : "border-primary/40 bg-primary/10 text-primary"
                        }`}
                      >
                        {incidentDetail.severity} SEVERITY
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] ${
                          incidentDetail.status === "RESOLVED"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : incidentDetail.status === "INVESTIGATING"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                              : "border-border/80 text-muted-foreground"
                        }`}
                      >
                        STATUS: {incidentDetail.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/5 text-primary font-mono text-[9px]"
                      >
                        {incidentDetail.confidence} PROVENANCE
                      </Badge>
                    </div>
                    <h2 className="text-foreground mt-1 text-base font-bold sm:text-lg">
                      {incidentDetail.title}
                    </h2>
                  </div>

                  {/* Risk Score Gauge */}
                  <div className="border-border/80 bg-secondary/30 flex shrink-0 items-center gap-3 rounded-md border px-3.5 py-1.5">
                    <div className="text-right">
                      <div className="text-muted-foreground font-mono text-[9px] font-bold uppercase tracking-wider">
                        COMPOSITE RISK
                      </div>
                      <div className="text-muted-foreground/80 font-mono text-[10px]">
                        Additive Model
                      </div>
                    </div>
                    <div className="text-primary font-mono text-xl font-bold tabular-nums">
                      {incidentDetail.risk_score}
                      <span className="text-muted-foreground font-mono text-xs">/100</span>
                    </div>
                  </div>
                </div>

                {/* RESOLUTION CENTER ACTION BAR */}
                <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-[11px] font-semibold">
                      Transition State:
                    </span>
                    <button
                      onClick={() => openStatusModal("INVESTIGATING")}
                      className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors ${
                        incidentDetail.status === "INVESTIGATING"
                          ? "bg-amber-500 text-white"
                          : "border-border/70 bg-secondary/40 text-foreground hover:bg-secondary border"
                      }`}
                    >
                      <Eye className="mr-1 inline h-3 w-3" />
                      Investigate
                    </button>
                    <button
                      onClick={() => openStatusModal("REVIEWED")}
                      className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors ${
                        incidentDetail.status === "REVIEWED"
                          ? "bg-primary text-primary-foreground"
                          : "border-border/70 bg-secondary/40 text-foreground hover:bg-secondary border"
                      }`}
                    >
                      <Check className="mr-1 inline h-3 w-3" />
                      Reviewed
                    </button>
                    <button
                      onClick={() => openStatusModal("RESOLVED")}
                      className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors ${
                        incidentDetail.status === "RESOLVED"
                          ? "bg-emerald-600 text-white"
                          : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      Resolve Incident
                    </button>
                  </div>

                  {incidentDetail.review_record?.resolution_note && (
                    <div className="line-clamp-1 max-w-xs font-mono text-[11px] italic text-emerald-400">
                      Latest Note: &ldquo;{incidentDetail.review_record.resolution_note}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* 2. RESOLUTION INTELLIGENCE & REMEDIATION CHECKLIST */}
              {incidentDetail.resolution_recommendations &&
                incidentDetail.resolution_recommendations.length > 0 && (
                  <div className="shadow-xs space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        Resolution Intelligence & Remediation Guidance
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 font-mono text-[9px] text-emerald-400"
                      >
                        EVIDENCE-BACKED ACTIONS
                      </Badge>
                    </div>

                    <div className="space-y-2.5">
                      {incidentDetail.resolution_recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="bg-card/60 space-y-2 rounded-md border border-emerald-500/20 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground text-xs font-semibold">
                              {rec.title}
                            </span>
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                              {rec.rule_id}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">{rec.why}</p>

                          {/* Recommended Actions */}
                          <div className="space-y-1 pt-0.5">
                            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                              RECOMMENDED REMEDIATION ACTIONS
                            </div>
                            {rec.recommended_actions.map((act, aIdx) => (
                              <div
                                key={aIdx}
                                className="text-foreground/90 flex items-start gap-1.5 text-xs"
                              >
                                <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>

                          {/* Verification Steps */}
                          <div className="border-border/60 space-y-1 border-t pt-1.5">
                            <div className="text-primary font-mono text-[9px] font-bold uppercase tracking-wider">
                              VERIFICATION CHECKLIST
                            </div>
                            {rec.verification_steps.map((ver, vIdx) => (
                              <div
                                key={vIdx}
                                className="text-foreground/90 flex items-start gap-1.5 text-xs"
                              >
                                <CheckCircle2 className="text-primary mt-0.5 h-3 w-3 shrink-0" />
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
              <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4">
                <div className="border-border/60 flex items-center justify-between border-b pb-2">
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                    <History className="text-primary h-3.5 w-3.5" />
                    Review Audit Trail & Transitions
                  </h3>
                  <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                    {historyData?.history?.length || incidentDetail.review_history?.length || 0}{" "}
                    records
                  </span>
                </div>

                {(historyData?.history || incidentDetail.review_history || []).length === 0 ? (
                  <div className="border-border/70 bg-secondary/20 text-muted-foreground rounded-md border p-3 text-center font-mono text-xs">
                    No status transitions recorded yet. Incident is in initial OPEN state.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(historyData?.history || incidentDetail.review_history || []).map((h, i) => (
                      <div
                        key={h.id || i}
                        className="border-border/70 bg-secondary/20 flex flex-col justify-between gap-1 rounded-md border p-2.5 text-xs sm:flex-row sm:items-center"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="bg-secondary text-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                              {h.previous_status} &rarr; {h.new_status}
                            </span>
                            <span className="text-foreground font-semibold">{h.reviewer}</span>
                          </div>
                          {h.resolution_note && (
                            <div className="font-mono text-[11px] italic text-emerald-400">
                              &ldquo;{h.resolution_note}&rdquo;
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground font-mono text-[10px]">
                          {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. INCIDENT STORY & NARRATIVE */}
              <div className="border-border/80 bg-card/60 shadow-xs space-y-2.5 rounded-lg border p-4">
                <div className="border-border/60 flex items-center justify-between border-b pb-2">
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                    <Compass className="text-primary h-3.5 w-3.5" />
                    Deterministic Incident Narrative
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-border/70 text-muted-foreground font-mono text-[9px]"
                  >
                    FACTS-DERIVED STORY
                  </Badge>
                </div>
                <div className="text-foreground/90 space-y-1.5 text-xs leading-relaxed">
                  {incidentDetail.story.narrative_paragraphs.map((para, i) => (
                    <p key={i} className="border-border/70 bg-secondary/20 rounded-md border p-2.5">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* 5. RISK EVOLUTION & ROOT CAUSE */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Risk Evolution */}
                <div className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-3.5">
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                    <TrendingUp className="text-primary h-3.5 w-3.5" />
                    Risk Evolution Progression
                  </h3>
                  <div className="space-y-1.5">
                    {incidentDetail.risk_evolution.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="border-border/70 bg-secondary/20 flex items-center justify-between rounded-md border p-2 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="bg-secondary/60 text-foreground rounded px-1 py-0.5 font-mono text-[9px] font-semibold">
                            {step.category}
                          </span>
                          <span className="text-foreground/90 max-w-[150px] truncate text-xs">
                            {step.factor}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
                          {step.points_added > 0 && (
                            <span className="font-bold text-amber-500">+{step.points_added}</span>
                          )}
                          <span className="text-primary font-bold">={step.running_score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Root Cause Analysis */}
                <div className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-3.5">
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                    <Cpu className="text-primary h-3.5 w-3.5" />
                    Root Cause & Signals
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="border-destructive/30 bg-destructive/10 rounded-md border p-2.5">
                      <div className="text-destructive font-mono text-[9px] font-bold uppercase tracking-wider">
                        PRIMARY SIGNAL
                      </div>
                      <div className="text-foreground mt-0.5 font-mono text-xs font-semibold">
                        {incidentDetail.root_cause.primary_signal}
                      </div>
                    </div>
                    <div className="border-border/70 bg-secondary/20 rounded-md border p-2.5">
                      <div className="text-muted-foreground mb-1 font-mono text-[9px] font-bold uppercase tracking-wider">
                        CONTRIBUTING SIGNALS
                      </div>
                      <ul className="text-muted-foreground list-inside list-disc space-y-1 font-mono text-[11px]">
                        {(incidentDetail.root_cause.contributing_signals || []).map((cs, i) => (
                          <li key={i}>{cs}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. AFFECTED SURFACE & ENGINEERING DNA CONTRAST */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Affected Surface */}
                <div className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-3.5">
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                    <Layers className="text-primary h-3.5 w-3.5" />
                    Affected Surface & Subsystems
                  </h3>
                  <div className="space-y-1.5">
                    {incidentDetail.affected_surface.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="border-border/70 bg-secondary/20 flex items-center justify-between rounded-md border p-2 text-xs"
                      >
                        <span className="text-foreground font-medium">{item.subsystem}</span>
                        <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px]">
                          <span>{item.file_count} file(s)</span>
                          {item.findings_count > 0 && (
                            <span className="text-destructive font-bold">
                              ({item.findings_count} findings)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engineering DNA Contrast */}
                <div className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-3.5">
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                    <Compass className="text-primary h-3.5 w-3.5" />
                    Engineering DNA Contrast
                  </h3>
                  <div className="border-border/70 bg-secondary/20 space-y-1.5 rounded-md border p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Normal Focus:</span>
                      <span className="text-primary font-mono font-semibold">
                        {incidentDetail.engineering_dna.normal_focus_dirs.join(", ") ||
                          "General Code"}
                      </span>
                    </div>
                    <div className="border-border/60 text-muted-foreground border-t pt-1 font-mono text-[11px] leading-relaxed">
                      {incidentDetail.engineering_dna.analysis_summary}
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. EVIDENCE GRAPH 3.0 WITH NAVIGATION CONTROLS */}
              <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                      <Activity className="text-primary h-3.5 w-3.5" />
                      Evidence Graph 3.0 & Causal Topology
                    </h3>
                    <p className="text-muted-foreground text-[11px]">
                      Deterministic DAG topology. Interactive pan & zoom controls. Click node to
                      inspect telemetry.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Zoom / Pan Navigation toolbar */}
                    <button
                      onClick={handleZoomIn}
                      className="border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground rounded border p-1.5 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground rounded border p-1.5 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleResetView}
                      className="border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground rounded border p-1.5 transition-colors"
                      title="Reset View"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <Badge
                      variant="outline"
                      className="border-border/80 bg-secondary/30 text-foreground font-mono text-[11px] tabular-nums"
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
                  className="border-border/80 bg-background/80 relative min-h-[160px] cursor-grab overflow-hidden rounded-md border p-3 active:cursor-grabbing"
                >
                  <div
                    style={{
                      transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                      transformOrigin: "top left",
                      transition: isPanning ? "none" : "transform 0.15s ease-out",
                    }}
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4"
                  >
                    {incidentDetail.evidence_graph.nodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`relative cursor-pointer rounded-md border p-2.5 transition ${
                            isSelected
                              ? "border-primary/60 bg-primary/10 shadow-sm"
                              : "border-border/70 bg-card/60 hover:border-border hover:bg-secondary/20"
                          }`}
                        >
                          <div className="text-muted-foreground mb-1 flex items-center justify-between font-mono text-[10px]">
                            <span>
                              #{node.step_number} {node.kind}
                            </span>
                            {node.severity && (
                              <span className="font-bold text-amber-400">{node.severity}</span>
                            )}
                          </div>
                          <div className="text-foreground line-clamp-1 text-xs font-medium">
                            {node.title}
                          </div>
                          <div className="text-muted-foreground mt-0.5 line-clamp-1 font-mono text-[10px]">
                            {node.subtitle}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Node Inspector Drawer */}
                {selectedNode && (
                  <div className="border-primary/40 bg-secondary/20 space-y-2 rounded-md border p-3">
                    <div className="border-border/60 flex items-center justify-between border-b pb-2">
                      <div className="text-primary font-mono text-xs font-semibold uppercase tracking-wider">
                        NODE INSPECTOR: {selectedNode.title}
                      </div>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
                      >
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs sm:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground block font-mono text-[10px]">
                          TIMESTAMP
                        </span>
                        <span className="text-foreground font-mono text-[11px] tabular-nums">
                          {new Date(selectedNode.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block font-mono text-[10px]">
                          CATEGORY
                        </span>
                        <span className="text-foreground font-mono text-[11px]">
                          {selectedNode.kind}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block font-mono text-[10px]">
                          PROVENANCE
                        </span>
                        <span className="font-mono text-[11px] text-emerald-400">
                          {selectedNode.provenance || "OBSERVED"}
                        </span>
                      </div>
                    </div>
                    {selectedNode.details && (
                      <div className="border-border/80 bg-background/90 text-muted-foreground max-h-32 overflow-y-auto rounded border p-2 font-mono text-[11px]">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedNode.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : activeIncidentId && (isDetailError || !incidentDetail) ? (
            <div className="border-border/80 bg-card/40 flex flex-col items-center justify-center rounded-lg border p-10 text-center shadow-sm">
              <AlertCircle className="mb-3 h-8 w-8 text-amber-400" />
              <h3 className="text-foreground text-sm font-semibold">Incident Not Found</h3>
              <p className="text-muted-foreground mt-1 max-w-md text-xs leading-relaxed">
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
                className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary mt-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                View All Project Incidents
              </button>
            </div>
          ) : (
            <div className="border-border/80 bg-card/40 flex flex-col items-center justify-center rounded-lg border p-10 text-center shadow-sm">
              <ShieldAlert className="text-muted-foreground/60 mb-3 h-8 w-8" />
              <h3 className="text-foreground text-sm font-semibold">Incident Command Center</h3>
              <p className="text-muted-foreground mt-1 max-w-md text-xs leading-relaxed">
                Select an incident from the stream to inspect its deterministic causal DAG, event
                timeline, affected code symbols, and execute resolution workflows.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── RESOLUTION & REVIEW NOTE MODAL WITH TEMPLATES ──────────────────── */}
      {resolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="border-border/80 bg-card w-full max-w-lg space-y-3 rounded-lg border p-4 shadow-xl">
            <div className="border-border/60 flex items-center justify-between border-b pb-2.5">
              <h3 className="text-foreground text-sm font-semibold">
                Update Status to {targetStatus}
              </h3>
              <Badge
                variant="outline"
                className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
              >
                AUDIT TRAIL LOGGED
              </Badge>
            </div>

            <p className="text-muted-foreground text-xs">
              Select a quick resolution template or enter custom audit notes documenting the action.
            </p>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                QUICK RESOLUTION TEMPLATES
              </span>
              <div className="border-border/80 bg-background/80 max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                {RESOLUTION_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResolutionNote(tmpl)}
                    className="text-muted-foreground hover:bg-secondary/40 hover:text-foreground w-full rounded px-2 py-1.5 text-left text-xs transition-colors"
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
              className="border-border/80 bg-background/80 text-foreground placeholder:text-muted-foreground/60 focus:border-primary w-full rounded-md border p-2.5 font-mono text-xs focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setResolutionModalOpen(false)}
                className="text-muted-foreground hover:bg-secondary/40 hover:text-foreground rounded-md px-3 py-1.5 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmStatusChange(resolutionNote)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                  targetStatus === "RESOLVED"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-primary hover:bg-primary/90"
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
