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
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  if (severity === "MEDIUM") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  if (severity === "LOW") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  return "text-primary border-primary/30 bg-primary/10";
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
    <div className="animate-fade-in-up bg-background mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-6 px-4 py-4 sm:px-6 md:py-6">
      {/* SECTION 1: HERO & STRUCTURED HIERARCHY */}
      <div data-tour="engineering-story-header" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[{ label: "Projects", to: "/projects" }, { label: project.display_name }]}
          />

          {/* Mode Switcher */}
          <div
            data-tour="live-observability-indicator"
            className="border-border/80 bg-secondary/30 flex self-start rounded-md border p-0.5 sm:self-auto"
          >
            <button
              onClick={() => setMode("LIVE")}
              className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                mode === "LIVE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Live Stream
            </button>
            <button
              onClick={() => setMode("TIME_TRAVEL")}
              className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                mode === "TIME_TRAVEL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Time Machine
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <h1 className="text-foreground text-xl font-semibold tracking-tight md:text-2xl">
              {project.display_name} Engineering Story
            </h1>
            <p className="text-muted-foreground font-mono text-xs">{project.root_path}</p>
          </div>

          {/* Quick Metrics Header */}
          <div className="flex items-center gap-2.5">
            <div className="border-border/80 bg-card/60 min-w-[110px] rounded-lg border p-2.5 text-center shadow-sm">
              <div className="text-foreground font-mono text-lg font-bold tabular-nums">
                {totalFindings}
              </div>
              <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                Security Issues
              </div>
            </div>
            <div className="border-border/80 bg-card/60 min-w-[110px] rounded-lg border p-2.5 text-center shadow-sm">
              <div className="text-foreground font-mono text-lg font-bold tabular-nums">
                {totalArchitecture}
              </div>
              <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                Arch Changes
              </div>
            </div>
          </div>
        </div>

        {/* ── STRUCTURED CAPABILITY HIERARCHY ──────────────────────────────── */}
        <div className="space-y-3">
          {/* Primary Action: Engineering Command Center */}
          <div className="border-border/80 bg-card/60 flex flex-col items-start justify-between gap-3 rounded-lg border p-4 shadow-sm md:flex-row md:items-center">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="border-primary/30 bg-primary/10 text-primary rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  PRIMARY COCKPIT
                </span>
                <h2 className="text-foreground text-sm font-semibold">
                  Engineering Command Center
                </h2>
              </div>
              <p className="text-muted-foreground text-xs">
                Real-time multi-panel engineering cockpit with AST cascade, live sessions stream,
                and active alerts.
              </p>
            </div>
            <Link
              to={`/projects/${project.id}/command-center`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors md:w-auto"
            >
              <Activity className="h-3.5 w-3.5" />
              Launch Command Center
            </Link>
          </div>

          {/* Secondary Intelligence Group: 6 Core Intelligence Hubs */}
          <div className="space-y-2">
            <div className="text-muted-foreground px-0.5 font-mono text-[10px] font-medium uppercase tracking-wider">
              Specialized Intelligence Hub
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <Link
                to={`/projects/${project.id}/security`}
                className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 group flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400 transition-transform group-hover:scale-105" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Security
                  </span>
                </div>
                <div>
                  <div className="text-foreground text-xs font-semibold">Security Center</div>
                  <div className="text-muted-foreground line-clamp-1 text-[11px]">
                    AST secret & vuln guardian
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/investigation`}
                className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 group flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Search className="h-3.5 w-3.5 text-amber-400 transition-transform group-hover:scale-105" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Forensics
                  </span>
                </div>
                <div>
                  <div className="text-foreground text-xs font-semibold">Investigation</div>
                  <div className="text-muted-foreground line-clamp-1 text-[11px]">
                    Incident DAG & resolution
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/predictions`}
                className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 group flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 transition-transform group-hover:scale-105" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Forecasting
                  </span>
                </div>
                <div>
                  <div className="text-foreground text-xs font-semibold">Predictive Center</div>
                  <div className="text-muted-foreground line-clamp-1 text-[11px]">
                    Telemetry-backed drift
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/knowledge-graph`}
                className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 group flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Share2 className="h-3.5 w-3.5 text-cyan-400 transition-transform group-hover:scale-105" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Topology
                  </span>
                </div>
                <div>
                  <div className="text-foreground text-xs font-semibold">Knowledge Graph</div>
                  <div className="text-muted-foreground line-clamp-1 text-[11px]">
                    Codebase relationship DAG
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/copilot`}
                className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 group flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Bot className="text-primary h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    AI Grounding
                  </span>
                </div>
                <div>
                  <div className="text-foreground text-xs font-semibold">AI Copilot</div>
                  <div className="text-muted-foreground line-clamp-1 text-[11px]">
                    Evidence-first codebase Q&A
                  </div>
                </div>
              </Link>

              <Link
                to={`/projects/${project.id}/ai-provenance`}
                className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 group flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400 transition-transform group-hover:scale-105" />
                  <span className="text-muted-foreground font-mono text-[9px] uppercase">
                    Attribution
                  </span>
                </div>
                <div>
                  <div className="text-foreground text-xs font-semibold">AI Provenance</div>
                  <div className="text-muted-foreground line-clamp-1 text-[11px]">
                    Deterministic AI tool ledger
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Tertiary / Memory & Utilities */}
          <div className="border-border/80 bg-secondary/15 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-2.5 px-3 text-xs">
            <div className="text-muted-foreground flex flex-wrap items-center gap-3.5">
              <span className="text-foreground font-semibold">Memory & Utilities:</span>
              <a
                href="#project-memory"
                className="hover:text-foreground inline-flex items-center gap-1 font-mono text-xs transition"
              >
                <Database className="text-primary h-3 w-3" />
                Project Memory
              </a>
              <a
                href={`${getApiBaseUrl()}/api/projects/${project.id}/context/export`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1 font-mono text-xs transition"
              >
                <Download className="text-muted-foreground h-3 w-3" />
                Export Markdown Context
              </a>
            </div>
            <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              Deterministic AST Engine Active
            </div>
          </div>
        </div>
      </div>

      {mode === "TIME_TRAVEL" && (
        <div className="space-y-6">
          <TimelineScrubber />
          <EvolutionDiff />
        </div>
      )}

      {/* SPRINT 7: Unified Project Health & Priorities */}
      <div>
        <ProjectHealthScorecard projectId={project.id} />
      </div>

      {/* SECTION 6: Project Pulse (Reused) */}
      <div>
        {visibleIntelligence && (
          <ProjectIntelligencePanel projectId={project.id} intelligence={visibleIntelligence} />
        )}
      </div>

      {/* SECTION 7: Session Journey */}
      <div className="space-y-3">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Layers className="text-primary h-4 w-4" />
          Session Journey
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {visibleSessions.map((s, idx) => (
            <div key={s.id} className="flex shrink-0 items-center gap-3">
              <div
                className={`flex min-w-[120px] flex-col items-center justify-center rounded-lg border p-3 shadow-sm transition-all ${
                  s.status === "ACTIVE"
                    ? "border-primary/50 bg-primary/10 ring-primary/20 ring-1"
                    : "border-border/80 bg-card/60"
                }`}
              >
                <div className="text-foreground font-mono text-xs font-semibold">
                  Session {visibleSessions.length - idx}
                </div>
                <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                  {formatRelativeTime(s.started_at)}
                </div>
                <div
                  className={`mt-1.5 font-mono text-[9px] font-bold uppercase tracking-wider ${s.status === "ACTIVE" ? "text-primary" : "text-muted-foreground"}`}
                >
                  {s.status}
                </div>
              </div>
              {idx < visibleSessions.length - 1 && (
                <div className="bg-border/80 h-[1px] w-6 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* SECTION 2 & 5: Engineering Journey (Vertical Timeline) */}
        <div data-tour="architecture-timeline" className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            Engineering Journey
          </h2>
          <div className="border-border/80 relative ml-3 space-y-4 border-l py-1 pl-4">
            {visibleEntries.length === 0 ? (
              <p className="text-muted-foreground font-mono text-xs">
                No timeline events recorded.
              </p>
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
        <div data-tour="security-evolution" className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              Architecture Evolution
            </h2>
            <div className="space-y-3">
              {sessionChunks.map((chunk, idx) => {
                const archChanges = chunk.entries.filter(
                  (e) =>
                    e.kind !== "SECURITY_FINDING" &&
                    e.kind !== "SESSION_START" &&
                    e.kind !== "SESSION_END",
                );
                if (archChanges.length === 0) return null;

                return (
                  <div
                    key={idx}
                    className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm"
                  >
                    <h3 className="text-muted-foreground mb-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                      Session {sessionChunks.length - idx}
                    </h3>
                    <div className="space-y-1.5">
                      {archChanges.map((change) => (
                        <div key={change.id} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span className="text-foreground font-mono">{change.title}</span>
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
                <p className="text-muted-foreground font-mono text-xs">
                  No architecture evolution observed.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              Security Evolution
            </h2>
            <div className="space-y-2">
              {visibleEntries.filter((e) => e.kind === "SECURITY_FINDING").length === 0 ? (
                <p className="text-muted-foreground font-mono text-xs">
                  No security findings observed.
                </p>
              ) : (
                visibleEntries
                  .filter((e) => e.kind === "SECURITY_FINDING")
                  .map((finding) => (
                    <div
                      key={finding.id}
                      className="border-border/80 bg-card/60 flex items-center justify-between rounded-lg border p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                        <div>
                          <div className="text-foreground text-xs font-medium">{finding.title}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">
                            Appeared {formatRelativeTime(finding.timestamp.toString())}
                          </div>
                        </div>
                      </div>
                      {finding.severity && (
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${getSeverityColor(finding.severity)}`}
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
