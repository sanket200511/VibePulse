import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ReplayView } from "./ReplayView";
import { useSessionReplay } from "./useSessionReplay";
import { ErrorState, LoadingState, EmptyState } from "../../components/states";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

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
    <div className="animate-fade-in-up mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs
          items={[
            { label: "History", to: "/history" },
            { label: `Session ${sessionId?.slice(0, 8) ?? ""}`, to: `/sessions/${sessionId}` },
            { label: "Replay" },
          ]}
        />
        <Link
          to={`/sessions/${sessionId}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Session Details
        </Link>
      </header>
      <ReplayView replay={replay} />
    </div>
  );
}
