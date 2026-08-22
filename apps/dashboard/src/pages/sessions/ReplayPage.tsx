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
    <div className="flex flex-1 flex-col p-4 md:p-8">
      <header className="mb-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "History", to: "/history" },
              { label: `Session ${sessionId?.slice(0, 8) ?? ""}`, to: `/sessions/${sessionId}` },
              { label: "Replay" },
            ]}
          />
          <Link
            to={`/sessions/${sessionId}`}
            className="text-secondary-text hover:text-primary-text inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Session Details
          </Link>
        </div>
      </header>
      <ReplayView replay={replay} />
    </div>
  );
}
