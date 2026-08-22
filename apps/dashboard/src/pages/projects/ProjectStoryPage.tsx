import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { ErrorState } from "../../components/states";
import { ProjectIntelligencePanel } from "./ProjectIntelligencePanel";
import { useProjectArchitectureTimeline } from "./useProjectArchitectureTimeline";
import {
  ShieldAlert,
  Layers,
  CheckCircle2,
  Activity,
  Bot,
  Cpu,
  Database,
  Download,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { TimelineCard } from "../../components/timeline";
import { mapArchitectureTimelineToViewModel } from "../../lib/events/mappers";
import { formatRelativeTime } from "../../lib/relative-time";
import type { Project } from "./types";
import type { Session } from "../sessions/types";
import type { ArchitectureTimelineEntry } from "../sessions/useSessionArchitectureTimeline";
import type { ProjectIntelligence } from "./types";
import { TimeMachineProvider, useTimeMachine } from "./TimeMachineContext";
import { TimelineScrubber } from "./TimelineScrubber";
import { EvolutionDiff } from "./EvolutionDiff";
import { ProjectHealthScorecard } from "./ProjectHealthScorecard";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

function getSeverityColor(severity: string | undefined) {
  if (severity === "HIGH" || severity === "CRITICAL")
    return "text-red-500 border-red-500/20 bg-red-500/10";
  if (severity === "MEDIUM") return "text-orange-500 border-orange-500/20 bg-orange-500/10";
  if (severity === "LOW") return "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
  return "text-accent-color border-accent-color/20 bg-accent-color/10";
}

// Group entries into sessions
function chunkTimelineBySessions(entries: ArchitectureTimelineEntry[]) {
  const sessions: {
    startIndex: number;
    endIndex: number;
    entries: ArchitectureTimelineEntry[];
    startTime: Date;
  }[] = [];
  let currentSession: ArchitectureTimelineEntry[] | null = null;

  for (const entry of entries) {
    if (entry.kind === "SESSION_START") {
      currentSession = [entry];
    } else if (entry.kind === "SESSION_END") {
      if (currentSession && currentSession.length > 0) {
        currentSession.push(entry);
        sessions.push({
          startIndex: 0,
          endIndex: 0, // not strictly needed
          entries: currentSession,
          startTime: new Date(currentSession[0]?.timestamp || entry.timestamp),
        });
        currentSession = null;
      }
    } else {
      if (currentSession) currentSession.push(entry);
    }
  }
  // In case of active session without end
  if (currentSession && currentSession.length > 0) {
    sessions.push({
      startIndex: 0,
      endIndex: 0,
      entries: currentSession,
      startTime: new Date(currentSession[0]?.timestamp || new Date().toISOString()),
    });
  }
  return sessions;
}

function ProjectStoryContent({
  project,
  rawSessions,
}: {
  project: Project;
  rawSessions: Session[];
  rawEntries: ArchitectureTimelineEntry[];
  rawIntelligence: ProjectIntelligence;
}) {
  const { mode, setMode, visibleSessions, visibleEntries, visibleIntelligence } = useTimeMachine();

  const sessionChunks = chunkTimelineBySessions(visibleEntries);
  const totalFindings = visibleEntries.filter((e) => e.kind === "SECURITY_FINDING").length;
  const totalArchitecture = visibleEntries.filter(
    (e) => e.kind !== "SECURITY_FINDING" && e.kind !== "SESSION_START" && e.kind !== "SESSION_END",
  ).length;

  return (
    <div className="animate-fade-in-up bg-background flex flex-1 flex-col p-6 md:p-8">
      {/* SECTION 1: HERO & STRUCTURED HIERARCHY */}
      <div data-tour="engineering-story-header" className="mb-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[{ label: "Projects", to: "/projects" }, { label: project.display_name }]}
          />

          {/* Mode Switcher */}
          <div
            data-tour="live-observability-indicator"
            className="bg-card border-border flex self-start rounded-lg border p-0.5 shadow-sm sm:self-auto"
          >
            <button
              onClick={() => setMode("LIVE")}
              className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === "LIVE"
                  ? "bg-accent-color text-background shadow-sm"
                  : "text-secondary-text hover:text-primary-text"
              }`}
            >
              Live Stream
            </button>
            <button
              onClick={() => setMode("TIME_TRAVEL")}
              className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === "TIME_TRAVEL"
                  ? "bg-accent-color text-background shadow-sm"
                  : "text-secondary-text hover:text-primary-text"
              }`}
            >
              Time Machine
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="space-y-1.5">
            <h1 className="text-primary-text text-3xl font-extrabold tracking-tight md:text-4xl">
              {project.display_name} Engineering Story
            </h1>
            <p className="text-secondary-text font-mono text-xs md:text-sm">{project.root_path}</p>
          </div>

          {/* Quick Metrics Header */}
          <div className="flex items-center gap-3">
            <div className="bg-card border-border min-w-[120px] rounded-xl border p-3.5 text-center shadow-sm">
              <div className="text-primary-text font-mono text-2xl font-bold">{totalFindings}</div>
              <div className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
                Security Issues
              </div>
            </div>
            <div className="bg-card border-border min-w-[120px] rounded-xl border p-3.5 text-center shadow-sm">
              <div className="text-primary-text font-mono text-2xl font-bold">
                {totalArchitecture}
              </div>
              <div className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
                Arch Changes
              </div>
            </div>
          </div>
        </div>

        {/* ── STRUCTURED CAPABILITY HIERARCHY ──────────────────────────────── */}
        <div className="space-y-4">
          {/* Primary Action: Engineering Command Center */}
          <div className="bg-card border-border flex flex-col items-start justify-between gap-4 rounded-2xl border p-5 shadow-sm transition-all md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  PRIMARY COCKPIT
                </span>
                <h2 className="text-primary-text text-base font-bold">
                  Engineering Command Center
                </h2>
              </div>
              <p className="text-secondary-text text-xs">
                Real-time multi-panel engineering cockpit with AST cascade, live sessions stream,
                and active alerts.
              </p>
            </div>
            <Link
              to={`/projects/${project.id}/command-center`}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-500 md:w-auto"
            >
              <Activity className="h-4 w-4" />
              Launch Command Center
            </Link>
          </div>

          {/* Secondary Intelligence Group: 6 Core Intelligence Hubs */}
          <div className="space-y-2">
            <div className="text-secondary-text px-1 text-[11px] font-bold uppercase tracking-wider">
              Specialized Intelligence Hub
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Link
                to={`/projects/${project.id}/security`}
                className="bg-card hover:bg-card-subtle border-border group flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition hover:border-rose-500/40"
              >
                <div className="flex items-center justify-between">
                  <ShieldAlert className="h-4 w-4 text-rose-400 transition-transform group-hover:scale-110" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Security
                  </span>
                </div>
                <div>
                  <div className="text-primary-text text-xs font-bold">Security Center</div>
                  <div className="text-secondary-text line-clamp-1 text-[11px]">
                    AST secret & vuln guardian
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/investigation`}
                className="bg-card hover:bg-card-subtle border-border group flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition hover:border-amber-500/40"
              >
                <div className="flex items-center justify-between">
                  <Search className="h-4 w-4 text-amber-400 transition-transform group-hover:scale-110" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Forensics
                  </span>
                </div>
                <div>
                  <div className="text-primary-text text-xs font-bold">Investigation</div>
                  <div className="text-secondary-text line-clamp-1 text-[11px]">
                    Incident DAG & resolution
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/predictions`}
                className="bg-card hover:bg-card-subtle border-border group flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition hover:border-purple-500/40"
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="h-4 w-4 text-purple-400 transition-transform group-hover:scale-110" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Forecasting
                  </span>
                </div>
                <div>
                  <div className="text-primary-text text-xs font-bold">Predictive Center</div>
                  <div className="text-secondary-text line-clamp-1 text-[11px]">
                    Telemetry-backed drift
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/knowledge-graph`}
                className="bg-card hover:bg-card-subtle border-border group flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition hover:border-cyan-500/40"
              >
                <div className="flex items-center justify-between">
                  <Share2 className="h-4 w-4 text-cyan-400 transition-transform group-hover:scale-110" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Topology
                  </span>
                </div>
                <div>
                  <div className="text-primary-text text-xs font-bold">Knowledge Graph</div>
                  <div className="text-secondary-text line-clamp-1 text-[11px]">
                    Codebase relationship DAG
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/copilot`}
                className="bg-card hover:bg-card-subtle border-border group flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition hover:border-indigo-500/40"
              >
                <div className="flex items-center justify-between">
                  <Bot className="h-4 w-4 text-indigo-400 transition-transform group-hover:scale-110" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    AI Grounding
                  </span>
                </div>
                <div>
                  <div className="text-primary-text text-xs font-bold">AI Copilot</div>
                  <div className="text-secondary-text line-clamp-1 text-[11px]">
                    Evidence-first codebase Q&A
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/ai-provenance`}
                className="bg-card hover:bg-card-subtle border-border group flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition hover:border-emerald-500/40"
              >
                <div className="flex items-center justify-between">
                  <Cpu className="h-4 w-4 text-emerald-400 transition-transform group-hover:scale-110" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Attribution
                  </span>
                </div>
                <div>
                  <div className="text-primary-text text-xs font-bold">AI Provenance</div>
                  <div className="text-secondary-text line-clamp-1 text-[11px]">
                    Deterministic AI tool ledger
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Tertiary / Memory & Utilities */}
          <div className="bg-card/60 border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 px-4 text-xs">
            <div className="text-secondary-text flex flex-wrap items-center gap-4">
              <span className="text-primary-text font-semibold">Memory & Utilities:</span>
              <a
                href="#project-memory"
                className="hover:text-primary-text inline-flex items-center gap-1 transition"
              >
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                Project Memory
              </a>
              <a
                href={`${getApiBaseUrl()}/api/projects/${project.id}/context/export`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary-text inline-flex items-center gap-1 transition"
              >
                <Download className="text-secondary-text h-3.5 w-3.5" />
                Export Markdown Context
              </a>
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Deterministic AST Engine Active
            </div>
          </div>
        </div>
      </div>

      {mode === "TIME_TRAVEL" && (
        <div className="mb-12">
          <TimelineScrubber />
          <div className="mt-8">
            <EvolutionDiff />
          </div>
        </div>
      )}

      {/* SPRINT 7: Unified Project Health & Priorities */}
      <div className="mb-10">
        <ProjectHealthScorecard projectId={project.id} />
      </div>

      {/* SECTION 6: Project Pulse (Reused) */}
      <div className="mb-12">
        {visibleIntelligence && (
          <ProjectIntelligencePanel projectId={project.id} intelligence={visibleIntelligence} />
        )}
      </div>

      {/* SECTION 7: Session Journey */}
      <div className="mb-12">
        <h2 className="text-primary-text mb-6 flex items-center gap-2 text-xl font-bold tracking-tight">
          <Layers className="text-accent-color h-5 w-5" />
          Session Journey
        </h2>
        <div className="flex items-center gap-4 overflow-x-auto pb-4">
          {visibleSessions.map((s, idx) => (
            <div key={s.id} className="flex shrink-0 items-center gap-4">
              <div
                className={`flex flex-col items-center justify-center rounded-xl border p-4 shadow-sm transition-all ${
                  s.status === "ACTIVE"
                    ? "bg-accent-color/5 border-accent-color ring-accent-color/30 shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.1)] ring-1"
                    : "bg-card border-border"
                }`}
              >
                <div className="text-primary-text text-sm font-bold">
                  Session {visibleSessions.length - idx}
                </div>
                <div className="text-secondary-text mt-1 text-xs">
                  {formatRelativeTime(s.started_at)}
                </div>
                <div
                  className={`mt-2 text-[10px] font-bold uppercase ${s.status === "ACTIVE" ? "text-accent-color" : "text-muted-foreground"}`}
                >
                  {s.status}
                </div>
              </div>
              {idx < visibleSessions.length - 1 && <div className="bg-border h-0.5 w-8 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* SECTION 2 & 5: Engineering Journey (Vertical Timeline) */}
        <div data-tour="architecture-timeline">
          <h2 className="text-primary-text mb-6 text-xl font-bold tracking-tight">
            Engineering Journey
          </h2>
          <div className="border-border relative ml-4 space-y-6 border-l-2 py-2">
            {visibleEntries.length === 0 ? (
              <p className="text-secondary-text pl-6 text-sm">No timeline events recorded.</p>
            ) : (
              visibleEntries.map((entry) => {
                // Find the session that contains this event for replay link mapping
                let eventSessionId = undefined;
                if (entry.related_event_id) {
                  const sessionChunk = sessionChunks.find((c) =>
                    c.entries.some((e) => e.id === entry.id),
                  );
                  if (sessionChunk && sessionChunk.entries.length > 0) {
                    const sessionStart = sessionChunk.entries[0];
                    const s = rawSessions.find(
                      (session) =>
                        new Date(session.started_at).getTime() ===
                        new Date(sessionStart?.timestamp || 0).getTime(),
                    );
                    if (s) eventSessionId = s.id;
                  }
                }
                return (
                  <TimelineCard
                    key={entry.id}
                    event={mapArchitectureTimelineToViewModel(entry, project.id, eventSessionId)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 3 & 4: Architecture Evolution & Security Evolution */}
        <div data-tour="security-evolution" className="space-y-12">
          <div>
            <h2 className="text-primary-text mb-6 text-xl font-bold tracking-tight">
              Architecture Evolution
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {sessionChunks.map((chunk, idx) => {
                const archChanges = chunk.entries.filter(
                  (e) =>
                    e.kind !== "SECURITY_FINDING" &&
                    e.kind !== "SESSION_START" &&
                    e.kind !== "SESSION_END",
                );
                if (archChanges.length === 0) return null;

                return (
                  <div key={idx} className="bg-card border-border rounded-xl border p-5 shadow-sm">
                    <h3 className="text-secondary-text mb-4 text-xs font-bold uppercase tracking-wider">
                      Session {sessionChunks.length - idx}
                    </h3>
                    <div className="space-y-2">
                      {archChanges.map((change) => (
                        <div key={change.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="text-accent-color h-4 w-4" />
                          <span className="font-mono">{change.title}</span>
                          <span className="text-muted-foreground">— {change.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sessionChunks.every(
                (c) =>
                  c.entries.filter(
                    (e) =>
                      e.kind !== "SECURITY_FINDING" &&
                      e.kind !== "SESSION_START" &&
                      e.kind !== "SESSION_END",
                  ).length === 0,
              ) && (
                <p className="text-secondary-text text-sm">No architecture evolution observed.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-primary-text mb-6 text-xl font-bold tracking-tight">
              Security Evolution
            </h2>
            <div className="space-y-4">
              {visibleEntries.filter((e) => e.kind === "SECURITY_FINDING").length === 0 ? (
                <p className="text-secondary-text text-sm">No security findings observed.</p>
              ) : (
                visibleEntries
                  .filter((e) => e.kind === "SECURITY_FINDING")
                  .map((finding) => (
                    <div
                      key={finding.id}
                      className="bg-card border-border flex items-center justify-between rounded-xl border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="text-primary-text text-sm font-bold">{finding.title}</div>
                          <div className="text-muted-foreground text-xs">
                            Appeared {formatRelativeTime(finding.timestamp.toString())}
                          </div>
                        </div>
                      </div>
                      {finding.severity && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getSeverityColor(finding.severity)}`}
                        >
                          {finding.severity}
                        </span>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectStoryPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project> => {
      const response = await fetch(
        new URL(`/api/projects/${projectId}`, getApiBaseUrl()).toString(),
      );
      if (!response.ok) throw new Error("Project not found");
      return response.json();
    },
    enabled: !!projectId,
  });

  const intelligenceQuery = useQuery({
    queryKey: ["project_intelligence", projectId],
    queryFn: async (): Promise<ProjectIntelligence> => {
      const response = await fetch(
        new URL(`/api/projects/${projectId}/intelligence`, getApiBaseUrl()).toString(),
      );
      if (!response.ok) throw new Error("Failed to load intelligence");
      return response.json();
    },
    enabled: !!projectId,
  });

  const sessionsQuery = useQuery({
    queryKey: ["project_sessions", projectId, 0],
    queryFn: async () => {
      const response = await fetch(
        new URL(
          `/api/projects/${projectId}/sessions?limit=100&offset=0`,
          getApiBaseUrl(),
        ).toString(),
      );
      if (!response.ok) throw new Error("Failed to load sessions");
      return response.json() as Promise<{ sessions: Session[] }>;
    },
    enabled: !!projectId,
  });

  const { timeline, isLoading: isTimelineLoading } = useProjectArchitectureTimeline(projectId!);

  const isLoading =
    projectQuery.isLoading ||
    sessionsQuery.isLoading ||
    intelligenceQuery.isLoading ||
    isTimelineLoading;
  const isError = projectQuery.isError || sessionsQuery.isError || intelligenceQuery.isError;
  const project = projectQuery.data;
  const sessions = sessionsQuery.data?.sessions || [];
  const entries = timeline?.entries || [];
  const intelligence = intelligenceQuery.data;

  if (isLoading || !intelligence) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="border-accent-color/30 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-1 flex-col p-8">
        <ErrorState message="Failed to load Engineering Story" />
      </div>
    );
  }

  return (
    <TimeMachineProvider rawSessions={sessions} rawEntries={entries} rawIntelligence={intelligence}>
      <ProjectStoryContent
        project={project}
        rawSessions={sessions}
        rawEntries={entries}
        rawIntelligence={intelligence}
      />
    </TimeMachineProvider>
  );
}
