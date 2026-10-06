import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  RotateCcw,
  Wifi,
  WifiOff,
  Flame,
  Layers,
  Search,
  Bot,
  Shield,
  AlertTriangle,
  Send,
  HelpCircle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Project } from "../projects/types";
import type { HotspotItem } from "../predictions/usePredictions";
import { useCommandCenter } from "./useCommandCenter";
import { IntelligenceCascadeRibbon } from "./IntelligenceCascadeRibbon";
import { LiveEventCascadeStream } from "./LiveEventCascadeStream";
import { ProjectHealthScorecard } from "../projects/ProjectHealthScorecard";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import { useCopilot } from "../copilot/useCopilot";
import { useKnowledgeGraph } from "../knowledge-graph/useKnowledgeGraph";
import type { EntityType } from "../evidence/types";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

export function EngineeringCommandCenter() {
  const { projectId } = useParams<{ projectId: string }>();

  // Evidence Inspector Modal State
  const [inspectTarget, setInspectTarget] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);

  // Copilot input state
  const [copilotInput, setCopilotInput] = useState("");

  // Fetch project details
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(new URL(`/api/projects/${projectId}`, getApiBaseUrl()).toString());
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json() as Promise<Project>;
    },
    enabled: !!projectId,
  });

  const {
    wsStatus,
    activeStage,
    liveEvents,
    selectedEvent,
    setSelectedEventId,
    health,
    predictions,
    security,
    refreshAll,
  } = useCommandCenter(projectId, project?.root_path);

  // Embedded Copilot hook
  const { askQuestion, isAsking, lastResponse, suggestions } = useCopilot(projectId);

  // Knowledge Graph hook
  const { graph } = useKnowledgeGraph(projectId);

  if (!projectId) return null;

  const handleAskCopilot = async (qText: string) => {
    if (!qText.trim() || isAsking) return;
    try {
      await askQuestion({ query: qText.trim() });
    } catch {
      // Handled by hook error state
    }
  };

  const totalRiskScore =
    security?.security_findings?.reduce((acc, f) => acc + (f.risk_contribution || 0), 0) || 0;

  const securityPostureLabel =
    typeof security?.security_posture === "string"
      ? security.security_posture
      : (security?.security_posture as unknown as { status?: string })?.status || "CLEAN";

  const topForecastScore = predictions?.forecast_signals?.[0]?.forecast_score ?? 70;
  const topEvidenceTier = predictions?.forecast_signals?.[0]?.evidence_strength ?? "MODERATE";

  return (
    <div className="animate-fade-in-up bg-background mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:px-6 md:py-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: project?.display_name || "Project Story", to: `/projects/${projectId}` },
              { label: "Engineering Command Center" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project Story
          </Link>
        </div>

        <div className="border-border/50 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-foreground flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
                <Activity className="text-primary h-5 w-5" />
                {project?.display_name || "Engineering"} Command Center
              </h1>
              <Badge
                variant="outline"
                className={`font-mono text-[10px] font-medium ${
                  wsStatus === "open"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {wsStatus === "open" ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    LIVE STREAM ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3 text-amber-400" />
                    RECONNECTING...
                  </span>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 max-w-xl truncate font-mono text-xs">
              {project?.root_path}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => refreshAll()}
              className="border-border/70 bg-secondary/50 text-foreground hover:bg-secondary inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition"
            >
              <RotateCcw className="text-primary h-3 w-3" />
              Sync State
            </button>
            <Link
              to={`/projects/${projectId}/copilot`}
              className="border-primary/25 bg-primary/10 text-primary shadow-xs hover:bg-primary/20 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition"
            >
              <Bot className="h-3 w-3" />
              AI Copilot
            </Link>
            <Link
              to={`/projects/${projectId}/knowledge-graph`}
              className="border-border/70 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition"
            >
              <Layers className="text-primary h-3 w-3" />
              Knowledge Graph
            </Link>
            <Link
              to={`/projects/${projectId}/investigation`}
              className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition"
            >
              <Search className="h-3 w-3" />
              Evidence Graph
            </Link>
          </div>
        </div>
      </div>

      {/* ── VISUAL INTELLIGENCE CASCADE RIBBON ─────────────────────────────── */}
      <IntelligenceCascadeRibbon activeStage={activeStage} />

      {/* ── METRIC TRIAD (HEALTH vs RISK vs FORECAST STRENGTH) ─────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Metric 1: Health Score */}
        <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs flex flex-col justify-between rounded-lg border p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              Project Health
            </span>
            <span className="font-mono text-[10px] font-semibold text-emerald-400">
              Higher = Better
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-foreground font-mono text-2xl font-bold tabular-nums">
              {health?.overall_health_score ?? 100}
            </span>
            <span className="text-muted-foreground font-mono text-xs">/ 100</span>
            <Badge
              variant="outline"
              className="ml-auto border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] font-medium text-emerald-400"
            >
              {health?.grade ?? "HEALTHY"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-[11px]">
            5-Dimension weighted composite derived from historical telemetry.
          </p>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs flex flex-col justify-between rounded-lg border p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              Security Risk Score
            </span>
            <span className="font-mono text-[10px] font-semibold text-rose-400">
              Higher = Worse
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                totalRiskScore > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              +{totalRiskScore}
            </span>
            <span className="text-muted-foreground font-mono text-xs">pts</span>
            <Badge
              variant="outline"
              className={`ml-auto font-mono text-[10px] font-medium ${
                totalRiskScore > 0
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {securityPostureLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Active unmitigated AST security rules and credential violations.
          </p>
        </div>

        {/* Metric 3: Forecast Strength */}
        <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs flex flex-col justify-between rounded-lg border p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              Forecast Strength
            </span>
            <span className="text-primary font-mono text-[10px] font-semibold">
              Empirical Baseline
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-primary font-mono text-2xl font-bold tabular-nums">
              {topForecastScore}
            </span>
            <span className="text-muted-foreground font-mono text-xs">/ 100</span>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary ml-auto font-mono text-[10px] font-medium"
            >
              {topEvidenceTier}
            </Badge>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Statistical confidence based on observed commit frequency and drift.
          </p>
        </div>
      </div>

      {/* ── SECTION 1: UNIFIED PROJECT HEALTH & PRIORITIES ─────────────────── */}
      <ProjectHealthScorecard projectId={projectId} />

      {/* ── SECTION 2: SECURITY & ACTIVE INCIDENTS COCKPIT ──────────────────── */}
      {security && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Active Security Findings */}
          <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                <Shield className="text-destructive h-3.5 w-3.5" />
                Security Intelligence 2.0
              </h3>
              <Link
                to={`/projects/${projectId}/investigate`}
                className="text-primary font-mono text-[11px] font-semibold hover:underline"
              >
                Investigate All →
              </Link>
            </div>

            {security.security_findings && security.security_findings.length > 0 ? (
              <div className="space-y-2">
                {security.security_findings.slice(0, 3).map((f) => (
                  <div
                    key={f.finding_id}
                    className="border-border/70 bg-secondary/20 flex items-start justify-between rounded-md border p-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="border-destructive/40 bg-destructive/10 text-destructive font-mono text-[10px] font-bold"
                        >
                          {f.severity}
                        </Badge>
                        <span className="text-foreground font-mono text-xs font-semibold">
                          {f.rule_id}
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-[11px]">{f.file_path}</p>
                      <p className="text-muted-foreground/80 text-[11px]">
                        {f.description || f.title}
                      </p>
                    </div>
                    <span className="text-destructive font-mono text-xs font-bold tabular-nums">
                      +{f.risk_contribution} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-500">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-mono text-[11px]">
                  Zero unmitigated security vulnerabilities in observed telemetry.
                </span>
              </div>
            )}
          </div>

          {/* Active Correlated Incidents */}
          <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Active Correlated Incidents
              </h3>
              <Link
                to={`/projects/${projectId}/investigate`}
                className="text-primary font-mono text-[11px] font-semibold hover:underline"
              >
                Triage & Resolve →
              </Link>
            </div>

            {security.correlated_incidents && security.correlated_incidents.length > 0 ? (
              <div className="space-y-2">
                {security.correlated_incidents.slice(0, 3).map((inc) => (
                  <div
                    key={inc.incident_id}
                    className="border-border/70 bg-secondary/20 flex items-start justify-between rounded-md border p-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 font-mono text-[10px] font-bold text-amber-500"
                        >
                          {inc.severity}
                        </Badge>
                        <span className="text-foreground font-mono text-xs font-semibold">
                          {inc.incident_id}
                        </span>
                      </div>
                      <p className="text-foreground text-xs font-medium">{inc.title}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">
                        Affected: {inc.affected_files?.join(", ") || "Configuration"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-mono text-xs font-bold tabular-nums text-amber-500">
                        {inc.risk_score}/100 Risk
                      </span>
                      <Link
                        to={`/projects/${projectId}/investigate`}
                        className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors"
                      >
                        Investigate
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-border/70 bg-secondary/20 text-muted-foreground flex items-center gap-2 rounded-md border p-3 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="font-mono text-[11px]">
                  No active incidents requiring immediate engineer triage.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 3: EMBEDDED AI COPILOT MINI-CONSOLE ────────────────────── */}
      <div className="border-border/80 bg-card/60 shadow-xs space-y-3.5 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-md">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-foreground font-mono text-xs font-bold uppercase tracking-wider">
                AI Engineering Copilot (Evidence-Backed)
              </h3>
              <p className="text-muted-foreground text-[11px]">
                Ask anything about project health, security, incidents, or file history.
              </p>
            </div>
          </div>
          <Link
            to={`/projects/${projectId}/copilot`}
            className="text-primary font-mono text-[11px] font-semibold hover:underline"
          >
            Open Full Console →
          </Link>
        </div>

        {/* Suggestion Pills */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s.suggestion_id}
                onClick={() => {
                  setCopilotInput(s.question);
                  void handleAskCopilot(s.question);
                }}
                className="border-border/70 bg-secondary/40 text-foreground/80 hover:border-primary/40 hover:bg-secondary hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
              >
                <Sparkles className="text-primary h-3 w-3" />
                {s.question}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={copilotInput}
            onChange={(e) => setCopilotInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleAskCopilot(copilotInput);
              }
            }}
            placeholder="Ask DepRadar anything about this project (e.g. 'What should I fix first?')..."
            className="border-border/80 bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden flex-1 rounded-md border px-3 py-1.5 text-xs"
          />
          <button
            onClick={() => {
              void handleAskCopilot(copilotInput);
            }}
            disabled={isAsking || !copilotInput.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isAsking ? "Querying..." : "Ask"}
          </button>
        </div>

        {/* Grounded Copilot Answer Box */}
        {lastResponse && (
          <div className="border-border/70 bg-secondary/20 mt-3 space-y-3 rounded-md border p-3.5">
            <div className="border-border/60 flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] font-bold ${
                    lastResponse.answerable
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-destructive/40 text-destructive bg-destructive/10"
                  }`}
                >
                  {lastResponse.answerable ? "ANSWERABLE" : "UNGROUNDED"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 text-primary font-mono text-[10px]"
                >
                  {lastResponse.intent}
                </Badge>
              </div>
              <span className="text-muted-foreground font-mono text-[10px]">
                Strength: {lastResponse.evidence_strength}
              </span>
            </div>

            <p className="text-foreground/90 text-xs leading-relaxed">{lastResponse.summary}</p>

            {/* Tri-State Provenance Badges */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                <span className="font-mono text-[10px] font-bold text-emerald-400">
                  [OBSERVED] Telemetry ({lastResponse.observed?.length || 0})
                </span>
                <p className="text-muted-foreground mt-1 line-clamp-2 font-mono text-[10px]">
                  {lastResponse.observed?.[0]?.statement || "None"}
                </p>
              </div>
              <div className="border-primary/20 bg-primary/5 rounded-md border p-2">
                <span className="text-primary font-mono text-[10px] font-bold">
                  [INFERRED] Derived ({lastResponse.inferred?.length || 0})
                </span>
                <p className="text-muted-foreground mt-1 line-clamp-2 font-mono text-[10px]">
                  {lastResponse.inferred?.[0]?.statement || "None"}
                </p>
              </div>
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                <span className="font-mono text-[10px] font-bold text-amber-400">
                  [UNKNOWN] Boundaries ({lastResponse.unknown?.length || 0})
                </span>
                <p className="text-muted-foreground mt-1 line-clamp-2 font-mono text-[10px]">
                  {lastResponse.unknown?.[0]?.statement || "None"}
                </p>
              </div>
            </div>

            {/* Priority Recommendation Trigger */}
            {lastResponse.recommendations &&
              lastResponse.recommendations.length > 0 &&
              lastResponse.recommendations[0] && (
                <div className="border-primary/20 bg-primary/5 flex items-center justify-between rounded-md border p-2">
                  <span className="text-foreground text-xs font-medium">
                    {lastResponse.recommendations[0]?.title}
                  </span>
                  <button
                    onClick={() => setInspectTarget({ type: "health", id: "overall" })}
                    className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] font-semibold transition-colors"
                  >
                    <HelpCircle className="h-3 w-3" />
                    Why? (Evidence)
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* ── SECTION 4: LIVE EVENT STREAM & CAUSAL CASCADE ─────────────────── */}
      <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4">
        <LiveEventCascadeStream
          projectId={projectId}
          events={liveEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEventId}
          health={health}
          security={security}
          onInspectWhy={(type, id) => setInspectTarget({ type, id })}
        />
      </div>

      {/* ── SECTION 5: PREDICTIVE HOTSPOTS & KNOWLEDGE GRAPH SNAPSHOT ───────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Predictive Hotspots */}
        {predictions && predictions.status === "READY" ? (
          <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                Active Engineering Hotspots
              </h3>
              <Link
                to={`/projects/${projectId}/predictions`}
                className="text-primary font-mono text-[11px] font-semibold hover:underline"
              >
                View Predictions →
              </Link>
            </div>

            <div className="space-y-2">
              {predictions.hotspots.slice(0, 3).map((h: HotspotItem) => (
                <div
                  key={h.file_path}
                  className="border-border/70 bg-secondary/20 space-y-1.5 rounded-md border p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground max-w-[240px] truncate font-mono text-xs font-semibold">
                      {h.file_path}
                    </span>
                    <span className="font-mono text-xs font-bold tabular-nums text-amber-500">
                      {h.hotspot_score}/100
                    </span>
                  </div>
                  <div className="bg-secondary h-1 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${h.hotspot_score}%` }}
                    />
                  </div>
                  <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
                    <span>Subsystem: {h.subsystem}</span>
                    <span className="tabular-nums">{h.activity_count} modifications</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-border/80 bg-card/60 flex items-center justify-center rounded-lg border p-6 lg:col-span-6">
            <span className="text-muted-foreground font-mono text-xs">
              Awaiting predictive telemetry baseline...
            </span>
          </div>
        )}

        {/* Knowledge Graph Snapshot */}
        <div className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
              <Layers className="text-primary h-3.5 w-3.5" />
              Knowledge Graph & Project Memory
            </h3>
            <Link
              to={`/projects/${projectId}/knowledge-graph`}
              className="text-primary font-mono text-[11px] font-semibold hover:underline"
            >
              Explore Full Graph →
            </Link>
          </div>

          <div className="border-border/70 bg-secondary/20 space-y-2.5 rounded-md border p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Connected Entities:</span>
              <span className="text-foreground font-mono font-bold tabular-nums">
                {graph?.total_nodes ?? 0} Nodes
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Semantic Relationships:</span>
              <span className="text-primary font-mono font-bold tabular-nums">
                {graph?.total_edges ?? 0} Edges
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subsystem Clusters:</span>
              <span className="text-foreground/80 font-mono text-[11px]">
                {graph?.subsystems?.join(", ") || "Configuration, Authentication, API Routes"}
              </span>
            </div>
            <div className="pt-1.5">
              <Link
                to={`/projects/${projectId}/knowledge-graph`}
                className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 inline-flex w-full items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-semibold transition-colors"
              >
                <Layers className="h-3.5 w-3.5" />
                Explore Knowledge Graph
              </Link>
            </div>
          </div>
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
