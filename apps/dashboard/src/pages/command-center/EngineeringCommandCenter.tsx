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
import { Badge } from "@vibepulse/ui";
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
    <div className="animate-fade-in-up bg-background flex flex-1 flex-col space-y-8 p-8">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: project?.display_name || "Project Story", to: `/projects/${projectId}` },
              { label: "Engineering Command Center" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-secondary-text hover:text-primary-text inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project Story
          </Link>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-primary-text flex items-center gap-2.5 text-3xl font-extrabold tracking-tight">
                <Activity className="h-7 w-7 text-indigo-400" />
                {project?.display_name || "Engineering"} Command Center
              </h1>
              <Badge
                variant="outline"
                className={`font-mono text-xs font-bold ${
                  wsStatus === "open"
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                    : "border-amber-500/50 bg-amber-950/40 text-amber-300"
                }`}
              >
                {wsStatus === "open" ? (
                  <span className="flex items-center gap-1.5">
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    LIVE STREAM ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <WifiOff className="h-3 w-3 text-amber-400" />
                    RECONNECTING...
                  </span>
                )}
              </Badge>
            </div>
            <p className="text-secondary-text mt-1 font-mono text-xs">{project?.root_path}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refreshAll()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
              Sync State
            </button>
            <Link
              to={`/projects/${projectId}/copilot`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 shadow-sm transition hover:bg-indigo-600/30"
            >
              <Bot className="h-3.5 w-3.5 text-indigo-400" />
              AI Copilot
            </Link>
            <Link
              to={`/projects/${projectId}/knowledge-graph`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              Knowledge Graph
            </Link>
            <Link
              to={`/projects/${projectId}/investigation`}
              className="border-accent-color/30 bg-accent-color/10 text-accent-color hover:bg-accent-color/20 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
            >
              <Search className="h-3.5 w-3.5" />
              Evidence Graph
            </Link>
          </div>
        </div>
      </div>

      {/* ── VISUAL INTELLIGENCE CASCADE RIBBON ─────────────────────────────── */}
      <IntelligenceCascadeRibbon activeStage={activeStage} />

      {/* ── METRIC TRIAD (HEALTH vs RISK vs FORECAST STRENGTH) ─────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric 1: Health Score */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Project Health
            </span>
            <span className="text-[10px] font-semibold text-emerald-400">Higher = Better</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white">
              {health?.overall_health_score ?? 100}
            </span>
            <span className="font-mono text-sm text-gray-500">/ 100</span>
            <Badge
              variant="outline"
              className="ml-auto border-emerald-500/40 bg-emerald-950/40 text-xs font-bold text-emerald-300"
            >
              {health?.grade ?? "HEALTHY"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            5-Dimension weighted composite derived from historical telemetry.
          </p>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Security Risk Score
            </span>
            <span className="text-[10px] font-semibold text-rose-400">Higher = Worse</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-extrabold ${
                totalRiskScore > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              +{totalRiskScore}
            </span>
            <span className="font-mono text-sm text-gray-500">pts</span>
            <Badge
              variant="outline"
              className={`ml-auto text-xs font-bold ${
                totalRiskScore > 0
                  ? "border-rose-500/40 bg-rose-950/40 text-rose-300"
                  : "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
              }`}
            >
              {securityPostureLabel}
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            Active unmitigated AST security rules and credential violations.
          </p>
        </div>

        {/* Metric 3: Forecast Strength */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Forecast Strength
            </span>
            <span className="text-[10px] font-semibold text-indigo-400">Empirical Baseline</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-indigo-300">
              {topForecastScore}
            </span>
            <span className="font-mono text-sm text-gray-500">/ 100</span>
            <Badge
              variant="outline"
              className="ml-auto border-indigo-500/40 bg-indigo-950/40 text-xs font-bold text-indigo-300"
            >
              {topEvidenceTier}
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            Statistical confidence based on observed commit frequency and drift.
          </p>
        </div>
      </div>

      {/* ── SECTION 1: UNIFIED PROJECT HEALTH & PRIORITIES ─────────────────── */}
      <ProjectHealthScorecard projectId={projectId} />

      {/* ── SECTION 2: SECURITY & ACTIVE INCIDENTS COCKPIT ──────────────────── */}
      {security && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Active Security Findings */}
          <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950 p-6 shadow-xl lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Shield className="h-4 w-4 text-rose-400" />
                Security Intelligence 2.0
              </h3>
              <Link
                to={`/projects/${projectId}/investigate`}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Investigate All →
              </Link>
            </div>

            {security.security_findings && security.security_findings.length > 0 ? (
              <div className="space-y-2.5">
                {security.security_findings.slice(0, 3).map((f) => (
                  <div
                    key={f.finding_id}
                    className="flex items-start justify-between rounded-lg border border-gray-800/80 bg-gray-900/40 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-rose-500/40 bg-rose-950/40 text-[10px] font-bold text-rose-300"
                        >
                          {f.severity}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-white">{f.rule_id}</span>
                      </div>
                      <p className="font-mono text-xs text-gray-300">{f.file_path}</p>
                      <p className="text-[11px] text-gray-400">{f.description || f.title}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-400">
                      +{f.risk_contribution} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-gray-800/60 bg-gray-900/20 p-4 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero unmitigated security vulnerabilities in observed telemetry.</span>
              </div>
            )}
          </div>

          {/* Active Correlated Incidents */}
          <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950 p-6 shadow-xl lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Active Correlated Incidents
              </h3>
              <Link
                to={`/projects/${projectId}/investigate`}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Triage & Resolve →
              </Link>
            </div>

            {security.correlated_incidents && security.correlated_incidents.length > 0 ? (
              <div className="space-y-2.5">
                {security.correlated_incidents.slice(0, 3).map((inc) => (
                  <div
                    key={inc.incident_id}
                    className="flex items-start justify-between rounded-lg border border-gray-800/80 bg-gray-900/40 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-950/40 text-[10px] font-bold text-amber-300"
                        >
                          {inc.severity}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-white">
                          {inc.incident_id}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-200">{inc.title}</p>
                      <p className="text-[10px] text-gray-400">
                        Affected: {inc.affected_files?.join(", ") || "Configuration"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {inc.risk_score}/100 Risk
                      </span>
                      <Link
                        to={`/projects/${projectId}/investigate`}
                        className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/20"
                      >
                        Investigate
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-gray-800/60 bg-gray-900/20 p-4 text-xs text-gray-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>No active incidents requiring immediate engineer triage.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 3: EMBEDDED AI COPILOT MINI-CONSOLE ────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-300">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                AI Engineering Copilot (Evidence-Backed)
              </h3>
              <p className="text-xs text-gray-400">
                Ask anything about project health, security, incidents, or file history.
              </p>
            </div>
          </div>
          <Link
            to={`/projects/${projectId}/copilot`}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Open Full Copilot Console →
          </Link>
        </div>

        {/* Suggestion Pills */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s.suggestion_id}
                onClick={() => {
                  setCopilotInput(s.question);
                  void handleAskCopilot(s.question);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-900/40 px-3 py-1 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-800/60"
              >
                <Sparkles className="h-3 w-3 text-indigo-400" />
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
            placeholder="Ask VibePulse anything about this project (e.g. 'What should I fix first?')..."
            className="flex-1 rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={() => {
              void handleAskCopilot(copilotInput);
            }}
            disabled={isAsking || !copilotInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isAsking ? "Querying..." : "Ask"}
          </button>
        </div>

        {/* Grounded Copilot Answer Box */}
        {lastResponse && (
          <div className="mt-4 space-y-4 rounded-xl border border-gray-800 bg-gray-900/80 p-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    lastResponse.answerable
                      ? "border-emerald-500/40 text-emerald-300"
                      : "border-rose-500/40 text-rose-300"
                  }`}
                >
                  {lastResponse.answerable ? "ANSWERABLE" : "UNGROUNDED"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 text-[10px] text-indigo-300"
                >
                  {lastResponse.intent}
                </Badge>
              </div>
              <span className="font-mono text-[10px] text-gray-500">
                Strength: {lastResponse.evidence_strength}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-gray-200">{lastResponse.summary}</p>

            {/* Tri-State Provenance Badges */}
            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
              <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                <span className="text-[10px] font-bold text-emerald-400">
                  [OBSERVED] Factual Telemetry ({lastResponse.observed?.length || 0})
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">
                  {lastResponse.observed?.[0]?.statement || "None"}
                </p>
              </div>
              <div className="rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-2.5">
                <span className="text-[10px] font-bold text-indigo-400">
                  [INFERRED] Derived Intelligence ({lastResponse.inferred?.length || 0})
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">
                  {lastResponse.inferred?.[0]?.statement || "None"}
                </p>
              </div>
              <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5">
                <span className="text-[10px] font-bold text-amber-400">
                  [UNKNOWN] Observation Boundaries ({lastResponse.unknown?.length || 0})
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">
                  {lastResponse.unknown?.[0]?.statement || "None"}
                </p>
              </div>
            </div>

            {/* Priority Recommendation Trigger */}
            {lastResponse.recommendations &&
              lastResponse.recommendations.length > 0 &&
              lastResponse.recommendations[0] && (
                <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-950/30 p-2.5">
                  <span className="text-xs font-semibold text-indigo-200">
                    {lastResponse.recommendations[0]?.title}
                  </span>
                  <button
                    onClick={() => setInspectTarget({ type: "health", id: "overall" })}
                    className="inline-flex items-center gap-1 rounded bg-indigo-600/30 px-2 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600/50"
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
      <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Predictive Hotspots */}
        {predictions && predictions.status === "READY" ? (
          <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950 p-6 shadow-xl lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Flame className="h-4 w-4 text-amber-400" />
                Active Engineering Hotspots
              </h3>
              <Link
                to={`/projects/${projectId}/predictions`}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                View Predictions →
              </Link>
            </div>

            <div className="space-y-3">
              {predictions.hotspots.slice(0, 3).map((h: HotspotItem) => (
                <div
                  key={h.file_path}
                  className="space-y-2 rounded-lg border border-gray-800/80 bg-gray-900/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="max-w-[240px] truncate font-mono text-xs font-bold text-white">
                      {h.file_path}
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {h.hotspot_score}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${h.hotspot_score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Subsystem: {h.subsystem}</span>
                    <span>{h.activity_count} modifications</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-gray-800/80 bg-gray-950 p-6 lg:col-span-6">
            <span className="text-xs text-gray-500">Awaiting predictive telemetry baseline...</span>
          </div>
        )}

        {/* Knowledge Graph Snapshot */}
        <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950 p-6 shadow-xl lg:col-span-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Layers className="h-4 w-4 text-indigo-400" />
              Knowledge Graph & Project Memory
            </h3>
            <Link
              to={`/projects/${projectId}/knowledge-graph`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Explore Full Graph →
            </Link>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-800/80 bg-gray-900/40 p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-400">Connected Entities:</span>
              <span className="font-mono font-bold text-white">
                {graph?.total_nodes ?? 0} Nodes
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-400">Semantic Relationships:</span>
              <span className="font-mono font-bold text-indigo-300">
                {graph?.total_edges ?? 0} Edges
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-400">Subsystem Clusters:</span>
              <span className="font-mono text-gray-300">
                {graph?.subsystems?.join(", ") || "Configuration, Authentication, API Routes"}
              </span>
            </div>
            <div className="pt-2">
              <Link
                to={`/projects/${projectId}/knowledge-graph`}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 py-2 text-xs font-bold text-indigo-200 transition hover:bg-indigo-600/30"
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
