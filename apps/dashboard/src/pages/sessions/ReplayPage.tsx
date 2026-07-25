import { Link, useParams } from "react-router-dom";
import { ReplayView } from "./ReplayView";
import { useSessionReplay } from "./useSessionReplay";
import { ErrorState, LoadingState, EmptyState } from "../../components/states";

export function ReplayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { replay, isLoading, isError } = useSessionReplay(sessionId ?? "", true);

  if (isLoading) return <LoadingState label="Building Replay…" />;
  if (isError) return <ErrorState message="We couldn't load this session's replay." />;
  if (!replay)
    return (
      <EmptyState title="No Replay Available" description="This session does not have a replay." />
    );

  return (
    <div className="flex flex-1 flex-col p-4 md:p-8">
      <header className="mb-6">
        <Link
          to={`/sessions/${sessionId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Back to Session Details
        </Link>
      </header>
      <ReplayView replay={replay} />
    </div>
  );
}
