import { Link, useParams } from "react-router-dom";
import { HealthPanel } from "./HealthPanel";
import { InsightsPanel } from "./InsightsPanel";
import { ReplayView } from "./ReplayView";
import { SessionOutcomeCard } from "./SessionOutcomeCard";
import { TimelineView } from "./TimelineView";
import { useSessionData } from "./useSessionData";
import { useSessionHealth } from "./useSessionHealth";
import { useSessionInsights } from "./useSessionInsights";
import { useSessionReplay } from "./useSessionReplay";
import { useSessionTimeline } from "./useSessionTimeline";

export function SessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { timeline, isLoading, isError } = useSessionTimeline(sessionId ?? "");
  const { profile, isLoading: isProfileLoading } = useSessionInsights(sessionId ?? "");
  const { session } = useSessionData(sessionId ?? "");
  const isCompleted = session?.status === "COMPLETED";
  const {
    replay,
    isLoading: isReplayLoading,
    isError: isReplayError,
  } = useSessionReplay(sessionId ?? "", isCompleted);
  const {
    health,
    isLoading: isHealthLoading,
    isError: isHealthError,
  } = useSessionHealth(sessionId ?? "", isCompleted);

  return (
    <main className="bg-background flex min-h-screen flex-col gap-6 p-8">
      <header>
        <Link to="/sessions" className="text-muted-foreground text-sm hover:underline">
          ← Back to sessions
        </Link>
        <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">Session Timeline</h1>
        <p className="text-muted-foreground text-sm">
          Chronological narrative of what happened during this session.
        </p>
      </header>

      {isLoading && (
        <p className="text-muted-foreground p-8 text-center text-sm">Loading timeline…</p>
      )}

      {isError && (
        <p className="text-destructive p-8 text-center text-sm">
          Could not load this session&rsquo;s timeline.
        </p>
      )}

      {timeline && (
        <>
          {profile && (
            <section className="border-border bg-card rounded-[16px] border p-6">
              <h2 className="text-foreground mb-4 text-lg font-semibold">Insights</h2>
              <InsightsPanel profile={profile} />
            </section>
          )}
          {isProfileLoading && (
            <p className="text-muted-foreground p-4 text-center text-sm">Generating insights…</p>
          )}

          <SessionOutcomeCard outcome={timeline.outcome} />

          <div className="border-border bg-card rounded-[16px] border p-4">
            <TimelineView entries={timeline.entries} />
          </div>

          {isCompleted && (
            <section className="border-border bg-card rounded-[16px] border p-6">
              <h2 className="text-foreground mb-4 text-lg font-semibold">Replay</h2>
              {isReplayLoading && (
                <div className="flex flex-col gap-2" aria-busy="true">
                  <div className="bg-muted h-8 animate-pulse rounded-[8px]" />
                  <div className="bg-muted h-24 animate-pulse rounded-[12px]" />
                </div>
              )}
              {isReplayError && (
                <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-[12px] border p-4 text-center text-sm">
                  Could not load this session&rsquo;s replay.
                </p>
              )}
              {replay && <ReplayView replay={replay} />}
            </section>
          )}

          {isCompleted && (
            <section className="border-border bg-card rounded-[16px] border p-6">
              <h2 className="text-foreground mb-4 text-lg font-semibold">Session Health</h2>
              {isHealthLoading && (
                <div className="flex flex-col gap-2" aria-busy="true">
                  <div className="bg-muted h-8 animate-pulse rounded-[8px]" />
                  <div className="bg-muted h-24 animate-pulse rounded-[12px]" />
                </div>
              )}
              {isHealthError && (
                <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-[12px] border p-4 text-center text-sm">
                  Could not load this session&rsquo;s health report.
                </p>
              )}
              {health && <HealthPanel health={health} />}
            </section>
          )}
        </>
      )}
    </main>
  );
}
