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
import { SectionContainer } from "../../components/layout/SectionContainer";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";

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
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header>
        <Link to="/history" className="text-muted-foreground text-sm hover:underline">
          ← Back to history
        </Link>
        <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">Session Timeline</h1>
        <p className="text-muted-foreground text-sm">
          Chronological narrative of what happened during this session.
        </p>
      </header>

      {isLoading && <LoadingState label="Preparing this session's timeline…" />}

      {isError && <ErrorState message="We couldn't load this session's timeline." />}

      {!isLoading && !isError && !timeline && (
        <EmptyState
          title="No timeline for this session"
          description="This session doesn't have any recorded activity yet."
        />
      )}

      {timeline && (
        <>
          {profile && (
            <SectionContainer title="Insights">
              <InsightsPanel profile={profile} />
            </SectionContainer>
          )}
          {isProfileLoading && <LoadingState label="Generating insights…" />}

          <SessionOutcomeCard outcome={timeline.outcome} />

          <div className="border-border bg-card rounded-[16px] border p-4">
            <TimelineView entries={timeline.entries} />
          </div>

          {isCompleted && (
            <SectionContainer title="Replay">
              {isReplayLoading && <LoadingState label="Building Replay…" />}
              {isReplayError && <ErrorState message="We couldn't load this session's replay." />}
              {replay && <ReplayView replay={replay} />}
            </SectionContainer>
          )}

          {isCompleted && (
            <SectionContainer title="Session Health">
              {isHealthLoading && <LoadingState label="Analyzing today's session…" />}
              {isHealthError && (
                <ErrorState message="We couldn't load this session's health report." />
              )}
              {health && <HealthPanel health={health} />}
            </SectionContainer>
          )}
        </>
      )}
    </div>
  );
}
