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
import { EmptyState, ErrorState, LoadingState } from "../../components/states";

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
  const { profile, isLoading: isProfileLoading } = useSessionInsights(sessionId ?? "");

  const isCompleted = session?.status === "COMPLETED";
  const {
    health,
    isLoading: isHealthLoading,
    isError: isHealthError,
  } = useSessionHealth(sessionId ?? "", isCompleted);

  if (isSessionLoading)
    return (
      <div className="p-8">
        <LoadingState label="Loading session details..." />
      </div>
    );
  if (isSessionError)
    return (
      <div className="p-8">
        <ErrorState message="We couldn't load this session." />
      </div>
    );
  if (!session)
    return (
      <div className="p-8">
        <EmptyState title="Session not found" description="The requested session does not exist." />
      </div>
    );

  return (
    <div className="animate-fade-in-up mx-auto flex w-full flex-1 flex-col gap-8 p-4 md:max-w-6xl md:p-8">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <Link
            to="/history"
            className="text-secondary-text hover:text-primary-text flex items-center gap-1 text-sm transition-colors"
          >
            ← Back to History
          </Link>
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-accent-color bg-accent-color/10 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {session.status === "COMPLETED" ? "Completed Session" : "Active Session"}
              </span>
              <span className="text-secondary-text font-mono text-xs">
                {new Date(session.started_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-primary-text mt-2 max-w-2xl truncate text-3xl font-extrabold tracking-tight">
              {session.summary?.headline || session.project_root.split(/[\\/]/).pop()}
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">{session.project_root}</p>
          </div>
        </div>

        {isCompleted && (
          <Link
            to={`/sessions/${session.id}/replay`}
            className="focus-visible:ring-accent-color bg-accent-color shadow-accent-color/20 hover:bg-accent-color/90 inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-8 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
          >
            <Play className="mr-2 h-4 w-4" />
            Replay Session
          </Link>
        )}
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
        <div className="mt-4 flex flex-col gap-12">
          <SessionOutcomeCard outcome={timeline.outcome} />

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-primary-text text-lg font-bold tracking-tight">
                Development Story
              </h2>
              <span className="text-secondary-text font-mono text-xs">
                {timeline.entries.length} segments
              </span>
            </div>
            <div className="border-border bg-card rounded-[24px] border p-2 shadow-sm sm:p-6">
              <TimelineView entries={timeline.entries} />
            </div>
          </section>

          {profile && (
            <section className="flex flex-col gap-4">
              <h2 className="text-primary-text text-lg font-bold tracking-tight">
                Observed Patterns
              </h2>
              <InsightsPanel profile={profile} />
            </section>
          )}
          {isProfileLoading && <LoadingState label="Analyzing behavior…" />}

          {isCompleted && (
            <section className="flex flex-col gap-4">
              <h2 className="text-primary-text text-lg font-bold tracking-tight">
                Session Signals
              </h2>
              {isHealthLoading && <LoadingState label="Analyzing session signals…" />}
              {isHealthError && <ErrorState message="We couldn't load this session's signals." />}
              {health && <HealthPanel health={health} />}

              <div className="border-border bg-card/50 mt-8 flex flex-col items-start justify-between gap-6 rounded-2xl border p-6 md:flex-row md:items-center">
                <div>
                  <h3 className="text-primary-text text-base font-bold tracking-tight">
                    Want to watch this session unfold?
                  </h3>
                  <p className="text-secondary-text mt-1 text-sm">
                    Replay the observed development sequence from start to finish.
                  </p>
                </div>
                <Link
                  to={`/sessions/${session.id}/replay`}
                  className="bg-accent-color hover:bg-accent-color/90 group inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-8 text-sm font-bold text-white shadow-sm transition-all"
                >
                  Open Session Replay
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
