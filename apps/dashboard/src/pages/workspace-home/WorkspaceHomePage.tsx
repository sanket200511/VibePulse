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
 * Implements the VibePulse Dashboard (docs/design/DASHBOARD.md) shell.
 * Integrates Demo Mode to present realistic telemetry and AI insights.
 */
export function WorkspaceHomePage() {
  const { isDemo } = useDemoMode();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const presentation = usePresentation();

  return (
    <div className="bg-background text-foreground animate-fade-in-up flex flex-1 justify-center px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="flex w-full max-w-5xl flex-col gap-6 md:gap-8">
        {/* Presentation Banner */}
        {isDemo && !bannerDismissed && (
          <div
            data-tour="presentation-welcome"
            className="bg-accent-color/[0.08] border-accent-color/20 text-primary-text flex items-center justify-between gap-4 rounded-xl border p-4 shadow-sm backdrop-blur-sm transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="bg-accent-color/10 flex h-7 w-7 items-center justify-center rounded-lg">
                <Sparkles className="text-accent-color h-4 w-4 shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  VibePulse Engineering Observability Platform
                </p>
                <p className="text-secondary-text mt-0.5 text-xs">
                  Using disposable demonstration telemetry to showcase continuous engineering
                  intelligence.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => presentation.start()}
                className="bg-accent-color text-background hover:bg-accent-color/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
              >
                <Play className="h-3.5 w-3.5" /> Start Guided Demo
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-secondary-text hover:text-primary-text rounded-md p-1 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <WorkspaceHeader isDemo={isDemo} />

        <main
          data-tour="presentation-summary"
          className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_3fr] lg:gap-8"
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
    <header className="border-border bg-card rounded-xl border p-6 shadow-sm transition-all duration-200">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
              Workspace
            </span>
            {wsConnected ? (
              <span className="bg-success-color/10 border-success-color/20 text-success-color flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                <span className="bg-success-color h-1.5 w-1.5 animate-pulse rounded-full" />
                Live
              </span>
            ) : (
              <span className="bg-muted/30 text-muted-foreground rounded-full border border-transparent px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                Connecting…
              </span>
            )}
          </div>
          <h1 className="text-primary-text text-xl font-bold tracking-tight">
            {session ? (session.project_root.split(/[/\\]/).pop() ?? "Workspace") : "VibePulse"}
          </h1>
          {session && (
            <p className="text-secondary-text mt-0.5 font-mono text-xs">{session.project_root}</p>
          )}
        </div>
        {session && (
          <div className="flex gap-3">
            <div className="bg-muted-color/40 border-border min-w-[90px] rounded-lg border px-4 py-2">
              <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
                Events
              </span>
              <span className="text-primary-text mt-0.5 text-sm font-semibold">
                {session.event_count}
              </span>
            </div>
            <div className="bg-muted-color/40 border-border min-w-[90px] rounded-lg border px-4 py-2">
              <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
                Language
              </span>
              <span className="text-primary-text mt-0.5 text-sm font-semibold">
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
    <header className="border-border bg-card hover:border-accent-color/20 relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300">
      <div className="bg-accent-color/5 pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl" />

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
              Current Workspace
            </span>
            <span className="bg-success-color/10 border-success-color/20 text-success-color flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              <span className="bg-success-color h-1.5 w-1.5 animate-pulse rounded-full" />
              Daemon Connected
            </span>
          </div>
          <h1 className="text-primary-text text-2xl font-bold tracking-tight md:text-3xl">
            Workspace: VibeSync
          </h1>
          <p className="text-secondary-text selection:bg-selection-color mt-1 font-mono text-xs">
            Path: {demoObservation.workspacePath}
          </p>
        </div>

        {/* Workspace details metrics */}
        <div className="border-border flex flex-wrap gap-4 border-t pt-4 md:border-t-0 md:pt-0">
          <div className="bg-muted-color/40 border-border min-w-[100px] rounded-lg border px-4 py-2.5">
            <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
              Session Start
            </span>
            <span className="text-primary-text mt-0.5 flex items-center gap-1 text-sm font-semibold">
              <Clock className="text-accent-color h-3.5 w-3.5" />
              09:00 AM
            </span>
          </div>
          <div className="bg-muted-color/40 border-border min-w-[100px] rounded-lg border px-4 py-2.5">
            <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
              Active Tech
            </span>
            <span className="text-primary-text mt-0.5 flex items-center gap-1 text-sm font-semibold">
              <Code className="text-accent-color h-3.5 w-3.5" />
              TS, CSS, HTML
            </span>
          </div>
          <div className="bg-muted-color/40 border-border min-w-[100px] rounded-lg border px-4 py-2.5">
            <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
              Watched Files
            </span>
            <span className="text-primary-text mt-0.5 flex items-center gap-1 text-sm font-semibold">
              <Layers className="text-accent-color h-3.5 w-3.5" />
              142 files
            </span>
          </div>
          <div className="bg-muted-color/40 border-border min-w-[100px] rounded-lg border px-4 py-2.5">
            <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
              Workspace Health
            </span>
            <span className="text-success-color mt-0.5 flex items-center gap-1 text-sm font-semibold">
              <Activity className="text-success-color h-3.5 w-3.5" />
              92% Optimal
            </span>
          </div>
          <div className="bg-muted-color/40 border-border min-w-[100px] rounded-lg border px-4 py-2.5">
            <span className="text-secondary-text block text-[9px] font-bold uppercase tracking-wider">
              Telemetry
            </span>
            <span className="text-primary-text mt-0.5 flex items-center gap-1 text-sm font-semibold">
              <span className="bg-success-color mr-1 h-1.5 w-1.5 animate-pulse rounded-full" />
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
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Connection Status Hero */}
      <DashboardSection title="Observation Status">
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  wsConnected
                    ? "bg-success-color/10 text-success-color"
                    : "bg-muted-foreground/10 text-muted-foreground"
                }`}
              >
                {wsConnected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-primary-text text-sm font-semibold">
                  {wsConnected ? "Daemon Connected" : "Awaiting Daemon"}
                </p>
                <p className="text-secondary-text text-xs">
                  {wsConnected
                    ? "Real-time telemetry stream active"
                    : "Start the VibePulse daemon to begin observing"}
                </p>
              </div>
            </div>
            {wsConnected && (
              <span className="bg-success-color/10 border-success-color/20 text-success-color flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
                <span className="bg-success-color h-1.5 w-1.5 animate-pulse rounded-full" />
                Live
              </span>
            )}
          </div>

          {/* Active session banner */}
          {!sessionLoading && session && (
            <div className="bg-accent-color/5 border-accent-color/20 mt-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-accent-color text-[10px] font-bold uppercase tracking-wider">
                    Active Session
                  </p>
                  <p className="text-primary-text mt-0.5 truncate text-sm font-semibold">
                    {session.summary?.headline || session.project_root.split(/[\\/]/).pop()}
                  </p>
                  <p className="text-secondary-text mt-0.5 font-mono text-[10px]">
                    {session.event_count} events · {session.primary_language ?? "Unknown"}
                  </p>
                </div>
                <Link
                  to={`/sessions/${session.id}`}
                  className="bg-accent-color hover:bg-accent-color/90 shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          )}
          {!sessionLoading && !session && wsConnected && (
            <p className="text-secondary-text mt-4 text-xs">
              No active session — start coding in an observed project to begin.
            </p>
          )}
        </div>
      </DashboardSection>

      {/* Projects */}
      <DashboardSection title="Projects">
        {projectsQuery.isLoading ? (
          <div className="border-border bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <div className="border-accent-color/30 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-secondary-text text-sm">Loading projects…</span>
            </div>
          </div>
        ) : (projectsQuery.data ?? []).length === 0 ? (
          <div className="border-border bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <FolderKanban className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-primary-text text-sm font-semibold">No projects observed yet</p>
                <p className="text-secondary-text text-xs">
                  Start the daemon in a project directory to begin observing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            data-tour="workspace-projects"
            className="bg-card border-border rounded-xl border p-6 shadow-sm"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(projectsQuery.data ?? []).slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-muted-color/30 border-border hover:border-accent-color/30 group block rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
                >
                  <h4 className="text-primary-text group-hover:text-accent-color text-sm font-semibold transition-colors">
                    {project.display_name}
                  </h4>
                  <p
                    className="text-secondary-text mt-1.5 truncate font-mono text-[10px]"
                    title={project.root_path}
                  >
                    {project.root_path}
                  </p>
                  <div className="border-border mt-4 flex items-center justify-between border-t pt-3 text-[10px]">
                    <span className="text-secondary-text">Last active</span>
                    <span className="text-primary-text font-medium">
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
              <div className="mt-4 text-center">
                <Link
                  to="/projects"
                  className="text-accent-color hover:text-accent-color/80 text-sm font-medium transition-colors"
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
          <div className="border-border bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <div className="border-accent-color/30 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-secondary-text text-sm">Loading sessions…</span>
            </div>
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="border-border bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <History className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-primary-text text-sm font-semibold">No sessions recorded yet</p>
                <p className="text-secondary-text text-xs">
                  Sessions appear automatically when coding activity is detected.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border-border divide-border divide-y rounded-xl border shadow-sm">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="hover:bg-muted/30 flex items-center justify-between gap-4 p-4 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                        s.status === "ACTIVE"
                          ? "bg-success-color animate-pulse"
                          : s.status === "IDLE"
                            ? "bg-warning-color"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <p className="text-primary-text truncate text-sm font-semibold">
                      {s.summary?.headline ?? s.project_root.split(/[\\/]/).pop()}
                    </p>
                  </div>
                  <p className="text-secondary-text mt-0.5 font-mono text-[10px]">
                    {s.event_count} events · {s.primary_language ?? "Unknown"} ·{" "}
                    {formatRelativeTime(s.last_event_at)}
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
              </Link>
            ))}
            <div className="p-4 text-center">
              <Link
                to="/history"
                className="text-accent-color hover:text-accent-color/80 text-sm font-medium transition-colors"
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
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Today's Story (Hero Card) */}
      <DashboardSection title="Today's Story">
        <div className="bg-card border-border hover:border-accent-color/30 group relative overflow-hidden rounded-xl border p-10 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md md:p-12">
          <div className="bg-accent-color absolute bottom-0 left-0 top-0 w-[5px]" />

          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-accent-color/10 border-accent-color/20 text-accent-color rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                Today&apos;s Headline
              </span>
              <span className="text-secondary-text font-mono text-xs">
                Based on 27 commits & file evolution logs
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-primary-text selection:bg-selection-color max-w-4xl text-2xl font-extrabold leading-tight tracking-tight md:text-3xl lg:text-4xl">
                {demoStory.headline}
              </h3>
              <p className="text-secondary-text selection:bg-selection-color mt-2 max-w-4xl text-base leading-relaxed md:text-lg">
                {demoStory.narrative}
              </p>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Current Session */}
      <DashboardSection title="Current Session">
        <div className="bg-card border-border hover:border-accent-color/30 cursor-pointer rounded-xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-primary-text text-base font-semibold">
                  Active Session in {demoSession.projectName}
                </h3>
                <p className="text-secondary-text mt-1 text-xs">
                  Passive monitoring running in workspace directory
                </p>
              </div>
              <span className="bg-observation-color/10 text-observation-color border-observation-color/20 animate-pulse rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {demoSession.status}
              </span>
            </div>

            <div className="border-border grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <span className="text-secondary-text block text-[10px] font-semibold uppercase tracking-wider">
                  Language
                </span>
                <span className="text-primary-text mt-1 block font-mono text-sm font-semibold">
                  {demoSession.primaryLanguage}
                </span>
              </div>
              <div>
                <span className="text-secondary-text block text-[10px] font-semibold uppercase tracking-wider">
                  Elapsed Duration
                </span>
                <span className="text-primary-text mt-1 block text-sm font-semibold">
                  {demoSession.durationMinutes} minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Timeline Preview (Development Journey) */}
      <DashboardSection title="Timeline Preview">
        <div className="bg-card border-border hover:border-accent-color/20 rounded-xl border p-6 shadow-sm transition-all duration-200">
          <p className="text-secondary-text mb-6 text-xs leading-relaxed">
            {"The story of software being created. A summary of today's work sessions."}
          </p>

          <div className="flex flex-col gap-8">
            {/* Morning Session Group */}
            <div className="relative pl-6">
              <div className="border-border absolute bottom-0 left-[7px] top-2 border-l-2" />

              <div className="mb-3 flex items-center gap-2">
                <span className="bg-muted-color/60 text-secondary-text border-border rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  09:00 - 11:00
                </span>
                <h4 className="text-primary-text text-xs font-bold uppercase tracking-wide">
                  Morning Setup & Daemon Initialization
                </h4>
              </div>

              <div className="flex flex-col gap-4">
                {demoTimeline.slice(0, 3).map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Midday Session Group */}
            <div className="relative pl-6">
              <div className="border-border absolute bottom-0 left-[7px] top-2 border-l-2" />

              <div className="mb-3 flex items-center gap-2">
                <span className="bg-muted-color/60 text-secondary-text border-border rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  11:00 - 13:00
                </span>
                <h4 className="text-primary-text text-xs font-bold uppercase tracking-wide">
                  Midday Pipeline Refactoring
                </h4>
              </div>

              <div className="flex flex-col gap-4">
                {demoTimeline.slice(3, 6).map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Afternoon Session Group */}
            <div className="relative pl-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="bg-muted-color/60 text-secondary-text border-border rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  13:00 - 14:00
                </span>
                <h4 className="text-primary-text text-xs font-bold uppercase tracking-wide">
                  Afternoon Validation & Signing Off
                </h4>
              </div>

              <div className="flex flex-col gap-4">
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
        <div className="bg-card border-border hover:border-accent-color/30 cursor-pointer rounded-xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-col gap-4">
            {demoMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="border-border flex items-start gap-3 border-b pb-3.5 last:border-0 last:pb-0"
              >
                <div className="text-success-color bg-success-color/10 mt-0.5 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-primary-text truncate text-sm font-semibold">
                      {milestone.title}
                    </h4>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {milestone.time}
                    </span>
                  </div>
                  <p className="text-secondary-text mt-1 text-xs leading-relaxed">
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
          className="bg-card border-border hover:border-accent-color/20 rounded-xl border p-6 shadow-sm transition-all duration-200"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {demoProjects.map((project) => {
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-muted-color/30 border-border hover:border-accent-color/30 group flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
                >
                  <div>
                    <h4 className="text-primary-text group-hover:text-accent-color text-sm font-semibold transition-colors">
                      {project.display_name}
                    </h4>
                    <p
                      className="text-secondary-text selection:bg-selection-color mt-1.5 truncate font-mono text-[10px]"
                      title={project.root_path}
                    >
                      {project.root_path}
                    </p>
                  </div>

                  <div className="border-border text-secondary-text mt-6 flex items-center justify-between border-t pt-3 text-[10px]">
                    <span>Last active</span>
                    <span className="text-primary-text font-medium">
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
  let dotBg = "bg-muted-color border-border text-secondary-text";
  let badgeStyles = "bg-muted-color text-secondary-text border-border";

  if (item.type === "code") {
    TypeIcon = Code;
    dotBg = "bg-accent-color/10 border-accent-color/20 text-accent-color";
    badgeStyles = "bg-accent-color/10 text-accent-color border-accent-color/20";
  } else if (item.type === "test") {
    TypeIcon = CheckCircle2;
    dotBg = "bg-success-color/10 border-success-color/20 text-success-color";
    badgeStyles = "bg-success-color/10 text-success-color border-success-color/20";
  } else if (item.type === "docs") {
    TypeIcon = FileText;
    dotBg = "bg-warning-color/10 border-warning-color/20 text-warning-color";
    badgeStyles = "bg-warning-color/10 text-warning-color border-warning-color/20";
  }

  return (
    <div className="hover:bg-muted-color/20 group relative flex items-start gap-4 rounded-lg p-3.5 transition-all duration-200">
      {/* Node point visual indicator */}
      <div
        className={`h-4.5 w-4.5 bg-background absolute -left-[25px] top-[18px] flex items-center justify-center rounded-full border transition-transform duration-200 group-hover:scale-110 ${dotBg}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </div>

      <span className="text-secondary-text w-12 shrink-0 select-none pt-0.5 font-mono text-xs">
        {item.timestamp}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeIcon className="text-secondary-text h-3.5 w-3.5 shrink-0" />
          <span className="text-primary-text group-hover:text-accent-color truncate text-sm font-semibold transition-colors">
            {item.title}
          </span>
          <span
            className={`py-0.2 select-none rounded border px-1.5 text-[8px] font-bold uppercase tracking-wider ${badgeStyles}`}
          >
            {item.type}
          </span>
        </div>
        {item.description && (
          <p className="text-secondary-text mt-1.5 max-w-2xl text-xs leading-relaxed">
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
    <aside className="flex flex-col gap-6 lg:gap-8">
      <DashboardSection title="Daemon Status">
        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  wsConnected
                    ? "bg-success-color/10 border-success-color/20 text-success-color animate-pulse border"
                    : "bg-muted/30 text-muted-foreground border border-transparent"
                }`}
              >
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-primary-text text-sm font-semibold">
                  {wsConnected ? "Observing" : "Disconnected"}
                </h4>
                <p className="text-secondary-text text-[10px]">
                  {wsConnected ? "Passive telemetry active" : "Run `pnpm dev` to connect"}
                </p>
              </div>
            </div>

            {session && (
              <div className="bg-muted-color/30 border-border flex flex-col gap-2 rounded-lg border p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-text">Events captured</span>
                  <span className="text-primary-text font-semibold">{session.event_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-text">Language</span>
                  <span className="text-primary-text font-semibold">
                    {session.primary_language ?? "—"}
                  </span>
                </div>
                <div className="border-border border-t pt-2">
                  <span className="text-secondary-text block text-[9px] font-semibold uppercase tracking-wider">
                    Observed Path
                  </span>
                  <span className="text-primary-text mt-1 block truncate font-mono text-[10px]">
                    {session.project_root}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Quick Links">
        <div className="bg-card border-border flex flex-col divide-y rounded-xl border shadow-sm">
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
              className="hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <div className="flex items-center gap-3">
                <Icon className="text-muted-foreground h-4 w-4" />
                <span className="text-primary-text font-medium">{label}</span>
              </div>
              <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
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
    <aside className="flex flex-col gap-6 lg:gap-8">
      {/* Observation Status */}
      <DashboardSection title="Observation Status">
        <div className="bg-card border-border hover:border-accent-color/20 overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-success-color/10 border-success-color/20 text-success-color flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-lg border">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-primary-text text-sm font-semibold">Active Observability</h4>
                <p className="text-secondary-text text-[10px]">
                  Passive filesystem telemetry stream running
                </p>
              </div>
            </div>

            <div className="bg-muted-color/30 border-border flex flex-col gap-2.5 rounded-lg border p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary-text">Telemetry Daemon</span>
                <span className="text-success-color flex items-center gap-1 font-semibold">
                  <span className="bg-success-color h-1.5 w-1.5 rounded-full" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-text">File Watchers</span>
                <span className="text-primary-text font-medium">3 active tasks</span>
              </div>
              <div className="border-border border-t pt-2.5">
                <span className="text-secondary-text block text-[9px] font-semibold uppercase tracking-wider">
                  Observed Path
                </span>
                <span className="text-primary-text selection:bg-selection-color mt-1 block truncate font-mono text-[10px]">
                  {demoObservation.workspacePath}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* Focus */}
      <DashboardSection title="Focus">
        <div className="bg-card border-border hover:border-accent-color/20 rounded-xl border p-5 shadow-sm transition-all duration-300">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-accent-color/10 text-accent-color flex h-7 w-7 items-center justify-center rounded-lg">
                <Layers className="h-4 w-4" />
              </div>
              <h4 className="text-primary-text text-sm font-semibold">Active Focus Rhythm</h4>
            </div>
            <p className="text-secondary-text text-xs leading-relaxed">
              Continuous focus: <span className="text-primary-text font-medium">4 hours</span>.
              Focus rhythm is currently optimal for deep architecture improvements.
            </p>
          </div>
        </div>
      </DashboardSection>

      {/* Today's Reflection */}
      <DashboardSection title="Today's Reflection">
        <div className="bg-card border-border hover:border-accent-color/20 relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300">
          <div className="flex flex-col gap-6">
            {demoAiInsights.map((insight) => (
              <div
                key={insight.id}
                className="border-border/40 border-b pb-5 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-primary-text text-sm font-semibold tracking-tight">
                    {insight.headline}
                  </span>
                  <span className="text-muted-foreground/60 shrink-0 font-mono text-[9px] uppercase tracking-wider">
                    {insight.category.toLowerCase().replace("_", " ")}
                  </span>
                </div>
                <p className="text-secondary-text/95 selection:bg-selection-color mt-2.5 font-serif text-[13px] italic leading-relaxed">
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
    <section className="flex flex-col gap-2">
      <h2 className="text-secondary-text text-xs font-semibold uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </section>
  );
}
