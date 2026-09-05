import { Badge } from "@depradar/ui";
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
        <EmptyState
          title="No engineering sessions observed yet"
          description="DepRadar registers sessions automatically once you begin writing code in a project folder. To get started, verify the DepRadar daemon is running in your terminal, open an observed workspace, and make edits to a file."
          action={
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://github.com/sanket200511/Vortex-DepRadar"
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm font-medium hover:underline"
              >
                Read the Docs
              </a>
            </div>
          }
          footer="Keyboard shortcut: Ctrl + K to open command menu"
        />
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
