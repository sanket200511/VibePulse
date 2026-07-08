import { Badge } from "@vibepulse/ui";
import { SessionRow } from "./SessionRow";
import { useSessionsData } from "./useSessionsData";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";

const STATUS_BADGE = {
  open: { variant: "success" as const, label: "Live" },
  connecting: { variant: "warning" as const, label: "Connecting…" },
  closed: { variant: "danger" as const, label: "Disconnected" },
};

/**
 * Session History (docs/design/PRODUCT_EXPERIENCE.md, Section 3.4) — find a
 * specific past session, in reverse-chronological order, and reopen it into
 * Session Detail. One of the three fixed Contextual Navigation anchors.
 */
export function SessionsPage() {
  const { sessions, connectionStatus, isLoading, isError } = useSessionsData();
  const status = STATUS_BADGE[connectionStatus];

  return (
    <div className="flex flex-1 flex-col p-8">
      <PageHeader
        title="History"
        description="Development sessions observed across your projects."
        meta={<Badge variant={status.variant}>{status.label}</Badge>}
      />

      <div className="border-border bg-card overflow-hidden rounded-[16px] border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Events</th>
                <th className="px-4 py-3 font-medium">Files</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && <LoadingState label="Preparing your session history…" />}

        {isError && <ErrorState message="We couldn't reach the API. Retrying in the background…" />}

        {!isLoading && !isError && sessions.length === 0 && (
          <EmptyState
            title="No sessions yet"
            description="Start coding in an observed project and your first session will appear here."
          />
        )}
      </div>
    </div>
  );
}
