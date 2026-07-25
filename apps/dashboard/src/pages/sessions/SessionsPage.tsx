import { Badge } from "@vibepulse/ui";
import { SessionCard } from "./SessionRow";
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
    <div className="animate-fade-in-up flex flex-1 flex-col p-8">
      <PageHeader
        title="History"
        description="Development sessions observed across your projects."
        meta={<Badge variant={status.variant}>{status.label}</Badge>}
      />

      {isLoading && <LoadingState label="Preparing your session history…" />}

      {isError && <ErrorState message="We couldn't reach the API. Retrying in the background…" />}

      {!isLoading && !isError && sessions.length === 0 && (
        <div className="border-border bg-card flex items-center justify-center overflow-hidden rounded-[16px] border p-8">
          <EmptyState
            title="No engineering sessions observed yet"
            description="VibePulse registers sessions automatically once you begin writing code in a project folder. To get started, verify the VibePulse daemon is running in your terminal, open an observed workspace, and make edits to a file."
          />
        </div>
      )}

      {!isLoading && !isError && sessions.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
