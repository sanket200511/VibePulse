import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { useDemoMode } from "../../demo/config";
import { ErrorState } from "../../components/states";
import { ProjectIntelligencePanel } from "./ProjectIntelligencePanel";
import { useProjectArchitectureTimeline } from "./useProjectArchitectureTimeline";
import { ArrowLeft, ShieldAlert, Layers, CheckCircle2 } from "lucide-react";
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
    <div className="animate-fade-in-up bg-background flex flex-1 flex-col p-8">
      {/* SECTION 1: HERO */}
      <div data-tour="engineering-story-header" className="mb-10">
        <Link
          to="/projects"
          className="text-secondary-text hover:text-primary-text mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-primary-text mb-2 text-4xl font-extrabold tracking-tight">
              {project.display_name} Engineering Story
            </h1>
            <p className="text-secondary-text font-mono text-sm">{project.root_path}</p>
          </div>

          {/* Mode Switcher */}
          <div
            data-tour="live-observability-indicator"
            className="bg-muted-color/30 flex rounded-xl p-1"
          >
            <button
              onClick={() => setMode("LIVE")}
              className={`rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${mode === "LIVE" ? "bg-card text-primary-text shadow-sm" : "text-muted-foreground hover:text-primary-text"}`}
            >
              Live
            </button>
            <button
              onClick={() => setMode("TIME_TRAVEL")}
              className={`rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${mode === "TIME_TRAVEL" ? "bg-accent-color text-background shadow-sm" : "text-muted-foreground hover:text-primary-text"}`}
            >
              Time Machine
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
                <div className="text-primary-text text-2xl font-bold">{totalFindings}</div>
                <div className="text-secondary-text text-[10px] font-semibold uppercase tracking-wider">
                  Security Issues
                </div>
              </div>
              <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
                <div className="text-primary-text text-2xl font-bold">{totalArchitecture}</div>
                <div className="text-secondary-text text-[10px] font-semibold uppercase tracking-wider">
                  Arch Changes
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link
                to={`/projects/${project.id}/security`}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
              >
                Security Intelligence
              </Link>
              <Link
                to={`/projects/${project.id}/predictions`}
                className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-400 transition-colors hover:bg-purple-500/20 hover:text-purple-300"
              >
                Predictive Intelligence
              </Link>
              <Link
                to={`/projects/${project.id}/ai-provenance`}
                className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                AI Provenance
              </Link>
              <Link
                to={`/projects/${project.id}/investigation`}
                className="text-accent-color hover:text-accent-color/80 bg-accent-color/10 border-accent-color/20 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                Search Events
              </Link>
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
  const { isDemo } = useDemoMode();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project> => {
      const response = await fetch(
        new URL(`/api/projects/${projectId}`, getApiBaseUrl()).toString(),
      );
      if (!response.ok) throw new Error("Project not found");
      return response.json();
    },
    enabled: !isDemo && !!projectId,
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
    enabled: !isDemo && !!projectId,
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
    enabled: !isDemo && !!projectId,
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
