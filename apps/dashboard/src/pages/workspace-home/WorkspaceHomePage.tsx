import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDemoMode } from "../../demo/config";
import { demoStory } from "../../demo/story";
import { demoTimeline } from "../../demo/timeline";
import { demoProjects } from "../../demo/projects";
import { demoSession } from "../../demo/session";
import { demoObservation } from "../../demo/observation";
import { demoAiInsights } from "../../demo/ai";
import { demoMilestones } from "../../demo/data";
import {
  X,
  Sparkles,
  Terminal,
  FileText,
  CheckCircle2,
  Clock,
  Code,
  Activity,
  Layers,
  CheckCircle,
  Play,
  FolderKanban,
  Wifi,
  WifiOff,
  History,
  ArrowRight,
} from "lucide-react";
import { usePresentation } from "../../components/presentation";
import { useCurrentSession } from "../sessions/useCurrentSession";
import { useSessionsData } from "../sessions/useSessionsData";
import { getApiBaseUrl } from "../../lib/api-config";
import { formatRelativeTime } from "../../lib/relative-time";
import type { Project } from "../projects/types";

/**
 * WorkspaceHomePage
 *
 * Implements the DepRadar Dashboard (docs/design/DASHBOARD.md) shell.
 * Integrates Demo Mode to present realistic telemetry and AI insights.
 */
export function WorkspaceHomePage() {
  const { isDemo } = useDemoMode();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const presentation = usePresentation();

  return (
    <div className="bg-background text-foreground animate-fade-in-up flex flex-1 justify-center px-4 py-4 sm:px-6 md:py-6 lg:px-8">
      <div className="flex w-full max-w-[1400px] flex-col gap-4 md:gap-5">
        {/* Presentation Banner */}
        {isDemo && !bannerDismissed && (
          <div
            data-tour="presentation-welcome"
            className="bg-primary/5 border-primary/20 text-foreground shadow-xs backdrop-blur-xs flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-md">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-tight">
                  DepRadar Engineering Observability Platform
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Using disposable demonstration telemetry to showcase continuous engineering
                  intelligence.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => presentation.start()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors"
              >
                <Play className="h-3 w-3" /> Start Guided Demo
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <WorkspaceHeader isDemo={isDemo} />

        <main
          data-tour="presentation-summary"
          className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr] lg:gap-5"
        >
          <PrimaryCanvas isDemo={isDemo} />
          <SecondaryRail isDemo={isDemo} />
        </main>
      </div>
    </div>
  );
}

/**
 * LiveWorkspaceHeader — real daemon-connected header for non-demo mode
 */
function LiveWorkspaceHeader() {
  const { session, connectionStatus } = useCurrentSession();
  const wsConnected = connectionStatus === "open";

  return (
    <header className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs rounded-lg border p-4 transition-all duration-200 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              Workspace
            </span>
            {wsConnected ? (
              <span className="flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                LIVE
              </span>
            ) : (
              <span className="bg-muted/40 text-muted-foreground border-border/60 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium">
                CONNECTING…
              </span>
            )}
          </div>
          <h1 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
            {session ? (session.project_root.split(/[/\\]/).pop() ?? "Workspace") : "DepRadar"}
          </h1>
          {session && (
            <p className="text-muted-foreground mt-0.5 max-w-xl truncate font-mono text-xs">
              {session.project_root}
            </p>
          )}
        </div>
        {session && (
          <div className="flex flex-wrap gap-2">
            <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
              <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
                Events
              </span>
              <span className="text-foreground mt-0.5 font-mono text-xs font-semibold tabular-nums">
                {session.event_count}
              </span>
            </div>
            <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
              <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
                Language
              </span>
              <span className="text-foreground mt-0.5 font-mono text-xs font-semibold">
                {session.primary_language ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * WorkspaceHeader
 */
export function WorkspaceHeader({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return <LiveWorkspaceHeader />;
  }

  return (
    <header className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs rounded-lg border p-4 transition-all duration-200 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              Current Workspace
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              DAEMON CONNECTED
            </span>
          </div>
          <h1 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
            Workspace: VibeSync
          </h1>
          <p className="text-muted-foreground max-w-xl truncate font-mono text-xs">
            Path: {demoObservation.workspacePath}
          </p>
        </div>

        {/* Workspace details metrics */}
        <div className="border-border/50 flex flex-wrap gap-2 border-t pt-3 md:border-t-0 md:pt-0">
          <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
            <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
              Session Start
            </span>
            <span className="text-foreground mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold tabular-nums">
              <Clock className="text-primary h-3 w-3" />
              09:00 AM
            </span>
          </div>
          <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
            <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
              Active Tech
            </span>
            <span className="text-foreground mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold">
              <Code className="text-primary h-3 w-3" />
              TS, CSS, HTML
            </span>
          </div>
          <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
            <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
              Watched Files
            </span>
            <span className="text-foreground mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold tabular-nums">
              <Layers className="text-primary h-3 w-3" />
              142 files
            </span>
          </div>
          <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
            <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
              Health
            </span>
            <span className="mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-emerald-400">
              <Activity className="h-3 w-3" />
              92% Optimal
            </span>
          </div>
          <div className="bg-secondary/40 border-border/70 min-w-[85px] rounded-md border px-3 py-1.5">
            <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
              Telemetry
            </span>
            <span className="mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold text-emerald-400">
              <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * LivePrimaryCanvas — real workspace data for non-demo mode
 */
function LivePrimaryCanvas() {
  const { session, connectionStatus, isLoading: sessionLoading } = useCurrentSession();
  const { sessions, isLoading: sessionsLoading } = useSessionsData();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const res = await fetch(new URL("/api/projects", getApiBaseUrl()).toString());
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      return data.projects;
    },
  });

  const wsConnected = connectionStatus === "open";
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* Connection Status Hero */}
      <DashboardSection title="Observation Status">
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md ${
                  wsConnected
                    ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                    : "bg-muted/40 text-muted-foreground border-border/60 border"
                }`}
              >
                {wsConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-foreground text-xs font-semibold tracking-tight">
                  {wsConnected ? "Daemon Connected" : "Awaiting Daemon"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {wsConnected
                    ? "Real-time telemetry stream active"
                    : "Start the DepRadar daemon to begin observing"}
                </p>
              </div>
            </div>
            {wsConnected && (
              <span className="flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                LIVE
              </span>
            )}
          </div>

          {/* Active session banner */}
          {!sessionLoading && session && (
            <div className="bg-primary/5 border-primary/20 mt-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-primary font-mono text-[10px] font-semibold uppercase tracking-wider">
                    Active Session
                  </p>
                  <p className="text-foreground mt-0.5 truncate text-xs font-semibold">
                    {session.summary?.headline || session.project_root.split(/[\\/]/).pop()}
                  </p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                    {session.event_count} events · {session.primary_language ?? "Unknown"}
                  </p>
                </div>
                <Link
                  to={`/sessions/${session.id}`}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          )}
          {!sessionLoading && !session && wsConnected && (
            <p className="text-muted-foreground mt-3 text-xs">
              No active session — start coding in an observed project to begin.
            </p>
          )}
        </div>
      </DashboardSection>

      {/* Projects */}
      <DashboardSection title="Projects">
        {projectsQuery.isLoading ? (
          <div className="border-border/80 bg-card/60 rounded-lg border p-4">
            <div className="flex items-center gap-2.5">
              <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground font-mono text-xs">Loading projects…</span>
            </div>
          </div>
        ) : (projectsQuery.data ?? []).length === 0 ? (
          <div className="border-border/80 bg-card/60 rounded-lg border p-4">
            <div className="flex items-center gap-2.5">
              <FolderKanban className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-foreground text-xs font-semibold">No projects observed yet</p>
                <p className="text-muted-foreground text-[11px]">
                  Start the daemon in a project directory to begin observing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            data-tour="workspace-projects"
            className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(projectsQuery.data ?? []).slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-secondary/30 border-border/70 hover:border-primary/40 hover:bg-secondary/60 group block rounded-md border p-3 transition-all duration-150"
                >
                  <h4 className="text-foreground group-hover:text-primary truncate text-xs font-semibold transition-colors">
                    {project.display_name}
                  </h4>
                  <p
                    className="text-muted-foreground mt-1 truncate font-mono text-[10px]"
                    title={project.root_path}
                  >
                    {project.root_path}
                  </p>
                  <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-2 text-[10px]">
                    <span className="text-muted-foreground font-mono">Last active</span>
                    <span className="text-foreground font-mono tabular-nums">
                      {new Date(project.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {(projectsQuery.data ?? []).length > 6 && (
              <div className="mt-3 text-center">
                <Link
                  to="/projects"
                  className="text-primary font-mono text-xs font-medium transition-colors hover:underline"
                >
                  View all {projectsQuery.data!.length} projects →
                </Link>
              </div>
            )}
          </div>
        )}
      </DashboardSection>

      {/* Recent Sessions */}
      <DashboardSection title="Recent Sessions">
        {sessionsLoading ? (
          <div className="border-border/80 bg-card/60 rounded-lg border p-4">
            <div className="flex items-center gap-2.5">
              <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground font-mono text-xs">Loading sessions…</span>
            </div>
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="border-border/80 bg-card/60 rounded-lg border p-4">
            <div className="flex items-center gap-2.5">
              <History className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-foreground text-xs font-semibold">No sessions recorded yet</p>
                <p className="text-muted-foreground text-[11px]">
                  Sessions appear automatically when coding activity is detected.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card/60 border-border/80 divide-border/60 shadow-xs divide-y rounded-lg border">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="hover:bg-muted/40 flex items-center justify-between gap-3 p-3 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                        s.status === "ACTIVE"
                          ? "animate-pulse bg-emerald-400"
                          : s.status === "IDLE"
                            ? "bg-amber-400"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <p className="text-foreground truncate text-xs font-semibold">
                      {s.summary?.headline ?? s.project_root.split(/[\\/]/).pop()}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                    {s.event_count} events · {s.primary_language ?? "Unknown"} ·{" "}
                    {formatRelativeTime(s.last_event_at)}
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              </Link>
            ))}
            <div className="p-2.5 text-center">
              <Link
                to="/history"
                className="text-primary font-mono text-xs font-medium transition-colors hover:underline"
              >
                View all sessions →
              </Link>
            </div>
          </div>
        )}
      </DashboardSection>
    </div>
  );
}

/**
 * PrimaryCanvas
 */
export function PrimaryCanvas({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return <LivePrimaryCanvas />;
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* Today's Story (Hero Card) */}
      <DashboardSection title="Today's Story">
        <div className="bg-card/70 border-border/80 hover:border-primary/40 shadow-xs group relative overflow-hidden rounded-lg border p-5 transition-all duration-200 sm:p-6">
          <div className="bg-primary absolute bottom-0 left-0 top-0 w-[3px]" />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 border-primary/25 text-primary rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
                Today&apos;s Headline
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                Based on 27 commits & file evolution logs
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-foreground max-w-3xl text-base font-bold leading-snug tracking-tight sm:text-lg">
                {demoStory.headline}
              </h3>
              <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed sm:text-sm">
                {demoStory.narrative}
              </p>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Current Session */}
      <DashboardSection title="Current Session">
        <div className="bg-card/60 border-border/80 hover:border-border shadow-xs cursor-pointer rounded-lg border p-4 transition-all duration-150">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-foreground text-sm font-semibold">
                  Active Session in {demoSession.projectName}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Passive monitoring running in workspace directory
                </p>
              </div>
              <span className="bg-primary/10 text-primary border-primary/25 animate-pulse rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider">
                {demoSession.status}
              </span>
            </div>

            <div className="border-border/50 grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <span className="text-muted-foreground block font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Language
                </span>
                <span className="text-foreground mt-0.5 block font-mono text-xs font-semibold">
                  {demoSession.primaryLanguage}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Elapsed Duration
                </span>
                <span className="text-foreground mt-0.5 block font-mono text-xs font-semibold tabular-nums">
                  {demoSession.durationMinutes} minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Timeline Preview (Development Journey) */}
      <DashboardSection title="Timeline Preview">
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-4 transition-all duration-150 sm:p-5">
          <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
            {"The story of software being created. A summary of today's work sessions."}
          </p>

          <div className="flex flex-col gap-6">
            {/* Morning Session Group */}
            <div className="relative pl-5">
              <div className="border-border/80 absolute bottom-0 left-[6px] top-2 border-l" />

              <div className="mb-2 flex items-center gap-2">
                <span className="bg-secondary/60 text-muted-foreground border-border/70 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  09:00 - 11:00
                </span>
                <h4 className="text-foreground font-mono text-[11px] font-semibold uppercase tracking-wide">
                  Morning Setup & Daemon Initialization
                </h4>
              </div>

              <div className="flex flex-col gap-2">
                {demoTimeline.slice(0, 3).map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Midday Session Group */}
            <div className="relative pl-5">
              <div className="border-border/80 absolute bottom-0 left-[6px] top-2 border-l" />

              <div className="mb-2 flex items-center gap-2">
                <span className="bg-secondary/60 text-muted-foreground border-border/70 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  11:00 - 13:00
                </span>
                <h4 className="text-foreground font-mono text-[11px] font-semibold uppercase tracking-wide">
                  Midday Pipeline Refactoring
                </h4>
              </div>

              <div className="flex flex-col gap-2">
                {demoTimeline.slice(3, 6).map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Afternoon Session Group */}
            <div className="relative pl-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="bg-secondary/60 text-muted-foreground border-border/70 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  13:00 - 14:00
                </span>
                <h4 className="text-foreground font-mono text-[11px] font-semibold uppercase tracking-wide">
                  Afternoon Validation & Signing Off
                </h4>
              </div>

              <div className="flex flex-col gap-2">
                {demoTimeline.slice(6).map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Today's Milestones */}
      <DashboardSection title="Today's Milestones">
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-4 transition-all duration-150 sm:p-5">
          <div className="flex flex-col gap-3">
            {demoMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="border-border/50 flex items-start gap-2.5 border-b pb-2.5 last:border-0 last:pb-0"
              >
                <div className="mt-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-foreground truncate text-xs font-semibold">
                      {milestone.title}
                    </h4>
                    <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                      {milestone.time}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardSection>

      {/* Projects */}
      <DashboardSection title="Projects">
        <div
          data-tour="workspace-projects"
          className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-4 transition-all duration-150 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {demoProjects.map((project) => {
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-secondary/30 border-border/70 hover:border-primary/40 hover:bg-secondary/60 group flex cursor-pointer flex-col justify-between rounded-md border p-3 transition-all duration-150"
                >
                  <div>
                    <h4 className="text-foreground group-hover:text-primary truncate text-xs font-semibold transition-colors">
                      {project.display_name}
                    </h4>
                    <p
                      className="text-muted-foreground mt-1 truncate font-mono text-[10px]"
                      title={project.root_path}
                    >
                      {project.root_path}
                    </p>
                  </div>

                  <div className="border-border/50 text-muted-foreground mt-4 flex items-center justify-between border-t pt-2 text-[10px]">
                    <span className="font-mono">Last active</span>
                    <span className="text-foreground font-mono tabular-nums">
                      {new Date(project.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}

/**
 * TimelineItem
 */
function TimelineItem({ item }: { item: (typeof demoTimeline)[0] }) {
  let TypeIcon = Terminal;
  let dotBg = "bg-secondary border-border/70 text-muted-foreground";
  let badgeStyles = "bg-secondary/60 text-muted-foreground border-border/70";

  if (item.type === "code") {
    TypeIcon = Code;
    dotBg = "bg-primary/10 border-primary/25 text-primary";
    badgeStyles = "bg-primary/10 text-primary border-primary/25";
  } else if (item.type === "test") {
    TypeIcon = CheckCircle2;
    dotBg = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
    badgeStyles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
  } else if (item.type === "docs") {
    TypeIcon = FileText;
    dotBg = "bg-amber-500/10 border-amber-500/25 text-amber-400";
    badgeStyles = "bg-amber-500/10 text-amber-400 border-amber-500/25";
  }

  return (
    <div className="hover:bg-muted/30 group relative flex items-start gap-3 rounded-md p-2.5 transition-all duration-150">
      {/* Node point visual indicator */}
      <div
        className={`bg-background absolute -left-[20px] top-[14px] flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-transform duration-150 group-hover:scale-110 ${dotBg}`}
      >
        <span className="h-1 w-1 rounded-full bg-current" />
      </div>

      <span className="text-muted-foreground w-11 shrink-0 select-none pt-0.5 font-mono text-[11px] tabular-nums">
        {item.timestamp}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeIcon className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="text-foreground group-hover:text-primary truncate text-xs font-semibold transition-colors">
            {item.title}
          </span>
          <span
            className={`py-0.2 select-none rounded border px-1 font-mono text-[8px] font-medium uppercase tracking-wider ${badgeStyles}`}
          >
            {item.type}
          </span>
        </div>
        {item.description && (
          <p className="text-muted-foreground mt-0.5 max-w-2xl text-[11px] leading-relaxed">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * LiveSecondaryRail — live daemon status for non-demo mode
 */
function LiveSecondaryRail() {
  const { session, connectionStatus } = useCurrentSession();
  const wsConnected = connectionStatus === "open";

  return (
    <aside className="flex flex-col gap-4 lg:gap-5">
      <DashboardSection title="Daemon Status">
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-3.5 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  wsConnected
                    ? "animate-pulse border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                    : "bg-muted/40 text-muted-foreground border-border/60 border"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-foreground text-xs font-semibold">
                  {wsConnected ? "Observing" : "Disconnected"}
                </h4>
                <p className="text-muted-foreground text-[10px]">
                  {wsConnected ? "Passive telemetry active" : "Run `pnpm dev` to connect"}
                </p>
              </div>
            </div>

            {session && (
              <div className="bg-secondary/30 border-border/70 flex flex-col gap-1.5 rounded-md border p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Events captured</span>
                  <span className="text-foreground font-mono text-xs font-semibold tabular-nums">
                    {session.event_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Language</span>
                  <span className="text-foreground font-mono text-xs font-semibold">
                    {session.primary_language ?? "—"}
                  </span>
                </div>
                <div className="border-border/50 border-t pt-1.5">
                  <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
                    Observed Path
                  </span>
                  <span className="text-foreground mt-0.5 block truncate font-mono text-[10px]">
                    {session.project_root}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Quick Links">
        <div className="bg-card/60 border-border/80 divide-border/60 shadow-xs flex flex-col divide-y rounded-lg border">
          {(
            [
              { label: "View All Projects", to: "/projects", icon: FolderKanban },
              { label: "Session History", to: "/history", icon: History },
              { label: "Investigation Engine", to: "/investigation", icon: Activity },
            ] as const
          ).map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="hover:bg-muted/40 flex items-center justify-between gap-3 px-3 py-2.5 text-xs transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{label}</span>
              </div>
              <ArrowRight className="text-muted-foreground h-3 w-3" />
            </Link>
          ))}
        </div>
      </DashboardSection>
    </aside>
  );
}

/**
 * SecondaryRail
 */
export function SecondaryRail({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return <LiveSecondaryRail />;
  }

  return (
    <aside className="flex flex-col gap-4 lg:gap-5">
      {/* Observation Status */}
      <DashboardSection title="Observation Status">
        <div className="bg-card/60 border-border/80 shadow-xs overflow-hidden rounded-lg border p-3.5 transition-all duration-200 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 animate-pulse items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-foreground text-xs font-semibold">Active Observability</h4>
                <p className="text-muted-foreground text-[10px]">
                  Passive filesystem telemetry stream running
                </p>
              </div>
            </div>

            <div className="bg-secondary/30 border-border/70 flex flex-col gap-2 rounded-md border p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Telemetry Daemon</span>
                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">File Watchers</span>
                <span className="text-foreground font-mono text-xs font-medium">
                  3 active tasks
                </span>
              </div>
              <div className="border-border/50 border-t pt-2">
                <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
                  Observed Path
                </span>
                <span className="text-foreground mt-0.5 block truncate font-mono text-[10px]">
                  {demoObservation.workspacePath}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Focus */}
      <DashboardSection title="Focus">
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-3.5 transition-all duration-200 sm:p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-md">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-foreground text-xs font-semibold">Active Focus Rhythm</h4>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Continuous focus:{" "}
              <span className="text-foreground font-mono font-medium">4 hours</span>. Focus rhythm
              is currently optimal for deep architecture improvements.
            </p>
          </div>
        </div>
      </DashboardSection>

      {/* Today's Reflection */}
      <DashboardSection title="Today's Reflection">
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-4 transition-all duration-200">
          <div className="flex flex-col gap-3">
            {demoAiInsights.map((insight) => (
              <div
                key={insight.id}
                className="border-border/50 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground text-xs font-semibold tracking-tight">
                    {insight.headline}
                  </span>
                  <span className="text-muted-foreground/80 shrink-0 font-mono text-[9px] uppercase tracking-wider">
                    {insight.category.toLowerCase().replace("_", " ")}
                  </span>
                </div>
                <p className="text-muted-foreground/90 mt-1.5 font-serif text-xs italic leading-relaxed">
                  &ldquo;{insight.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </DashboardSection>
    </aside>
  );
}

interface DashboardSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * DashboardSection
 */
export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </section>
  );
}
