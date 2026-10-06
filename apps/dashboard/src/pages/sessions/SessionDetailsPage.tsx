import { Link, useParams } from "react-router-dom";
import { Play } from "lucide-react";
import { HealthPanel } from "./HealthPanel";
import { InsightsPanel } from "./InsightsPanel";
import { SessionOutcomeCard } from "./SessionOutcomeCard";
import { TimelineView } from "./TimelineView";
import { useSessionData } from "./useSessionData";
import { useSessionHealth } from "./useSessionHealth";
import { useSessionInsights } from "./useSessionInsights";
import { useSessionTimeline } from "./useSessionTimeline";
import { useSessionArchitectureTimeline } from "./useSessionArchitectureTimeline";
import { ArchitectureTimelinePanel } from "./ArchitectureTimelinePanel";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

export function SessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    session,
    isLoading: isSessionLoading,
    isError: isSessionError,
  } = useSessionData(sessionId ?? "");
  const {
    timeline,
    isLoading: isTimelineLoading,
    isError: isTimelineError,
  } = useSessionTimeline(sessionId ?? "");
  const { timeline: archTimeline, isLoading: isArchLoading } = useSessionArchitectureTimeline(
    sessionId ?? "",
  );
  const { profile, isLoading: isProfileLoading } = useSessionInsights(sessionId ?? "");

  const isCompleted = session?.status === "COMPLETED";
  const {
    health,
    isLoading: isHealthLoading,
    isError: isHealthError,
  } = useSessionHealth(sessionId ?? "", isCompleted);

  if (isSessionLoading)
    return (
      <div className="py-8">
        <LoadingState label="Loading session details..." />
      </div>
    );
  if (isSessionError)
    return (
      <div className="py-8">
        <ErrorState message="We couldn't load this session." />
      </div>
    );
  if (!session)
    return (
      <div className="py-8">
        <EmptyState title="Session not found" description="The requested session does not exist." />
      </div>
    );

  const projectName = session.project_root.split(/[\\/]/).filter(Boolean).pop() || "Project";

  return (
    <div className="animate-fade-in-up mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 md:py-6">
      <header className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={
              session.project_id
                ? [
                    { label: "Projects", to: "/projects" },
                    { label: projectName, to: `/projects/${session.project_id}` },
                    { label: `Session ${session.id.slice(0, 8)}` },
                  ]
                : [
                    { label: "History", to: "/history" },
                    { label: `Session ${session.id.slice(0, 8)}` },
                  ]
            }
          />
          <Link
            to={session.project_id ? `/projects/${session.project_id}` : "/history"}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-[11px] transition-colors"
          >
            ← {session.project_id ? "Back to Project" : "Back to History"}
          </Link>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 pt-1 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  session.status === "COMPLETED"
                    ? "bg-secondary/70 text-muted-foreground border-border/80 border"
                    : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {session.status === "COMPLETED" ? "Completed" : "Active"}
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {new Date(session.started_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-foreground mt-1 max-w-2xl truncate text-lg font-bold sm:text-xl">
              {session.summary?.headline || projectName}
            </h1>
            <p className="text-muted-foreground font-mono text-xs">{session.project_root}</p>
          </div>

          {isCompleted && (
            <Link
              to={`/sessions/${session.id}/replay`}
              className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors"
            >
              <Play className="h-3 w-3 fill-current" />
              Replay Session
            </Link>
          )}
        </div>
      </header>

      {isTimelineLoading && <LoadingState label="Preparing session record…" />}
      {isTimelineError && <ErrorState message="We couldn't load this session's forensic record." />}

      {!isTimelineLoading && !isTimelineError && !timeline && (
        <EmptyState
          title="No timeline for this session"
          description="This session doesn't have any recorded activity yet."
        />
      )}

      {timeline && (
        <div className="space-y-4 sm:space-y-5">
          <SessionOutcomeCard outcome={timeline.outcome} />

          <section className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-4 sm:p-5">
            <div className="border-border/60 flex items-center justify-between border-b pb-2">
              <h2 className="text-foreground font-mono text-xs font-bold uppercase tracking-wider">
                Development Story
              </h2>
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {timeline.entries.length} segments
              </span>
            </div>
            <div className="pt-2">
              <TimelineView entries={timeline.entries} />
            </div>
          </section>

          {profile && (
            <section className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-4 sm:p-5">
              <h2 className="border-border/60 text-foreground border-b pb-2 font-mono text-xs font-bold uppercase tracking-wider">
                Observed Patterns
              </h2>
              <div className="pt-2">
                <InsightsPanel profile={profile} />
              </div>
            </section>
          )}
          {isProfileLoading && <LoadingState label="Analyzing behavior…" />}

          <section className="border-border/80 bg-card/60 shadow-xs space-y-2 rounded-lg border p-4 sm:p-5">
            <h2 className="border-border/60 text-foreground border-b pb-2 font-mono text-xs font-bold uppercase tracking-wider">
              Architecture Time Machine
            </h2>
            {isArchLoading && <LoadingState label="Reconstructing engineering story..." />}
            {!isArchLoading && archTimeline && (
              <div className="pt-2">
                <ArchitectureTimelinePanel
                  timeline={archTimeline}
                  projectId={session?.project_id || undefined}
                />
              </div>
            )}
          </section>

          {isCompleted && (
            <section className="border-border/80 bg-card/60 shadow-xs space-y-3 rounded-lg border p-4 sm:p-5">
              <h2 className="border-border/60 text-foreground border-b pb-2 font-mono text-xs font-bold uppercase tracking-wider">
                Session Signals
              </h2>
              {isHealthLoading && <LoadingState label="Analyzing session signals…" />}
              {isHealthError && <ErrorState message="We couldn't load this session's signals." />}
              {health && <HealthPanel health={health} />}

              <div className="border-border/70 bg-secondary/20 mt-4 flex flex-col items-start justify-between gap-4 rounded-md border p-3.5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-foreground text-xs font-semibold">
                    Watch this session unfold
                  </h3>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    Replay the observed development sequence from start to finish.
                  </p>
                </div>
                <Link
                  to={`/sessions/${session.id}/replay`}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors"
                >
                  Open Session Replay →
                </Link>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
