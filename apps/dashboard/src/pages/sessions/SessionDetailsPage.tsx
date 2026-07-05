import { Link, useParams } from "react-router-dom";
import { SessionOutcomeCard } from "./SessionOutcomeCard";
import { TimelineView } from "./TimelineView";
import { useSessionTimeline } from "./useSessionTimeline";

export function SessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { timeline, isLoading, isError } = useSessionTimeline(sessionId ?? "");

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
          <SessionOutcomeCard outcome={timeline.outcome} />

          <div className="border-border bg-card rounded-[16px] border p-4">
            <TimelineView entries={timeline.entries} />
          </div>
        </>
      )}
    </main>
  );
}
