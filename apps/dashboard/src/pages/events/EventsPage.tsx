import { Badge } from "@depradar/ui";
import { EventRow } from "./EventRow";
import { useEventsFeed } from "./useEventsFeed";
import { SessionBanner } from "../sessions/SessionBanner";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";

const STATUS_BADGE = {
  open: { variant: "success" as const, label: "Live" },
  connecting: { variant: "warning" as const, label: "Connecting…" },
  closed: { variant: "danger" as const, label: "Disconnected" },
};

export function EventsPage() {
  const { events, connectionStatus, isLoading, isError } = useEventsFeed();
  const status = STATUS_BADGE[connectionStatus];

  return (
    <div className="animate-fade-in-up mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <PageHeader
        title="Live Event Feed"
        description="Real-time file activity observed across your project."
        meta={<Badge variant={status.variant}>{status.label}</Badge>}
      />

      <SessionBanner />

      <div className="border-border/80 bg-card/60 shadow-xs overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border/80 bg-secondary/40 text-muted-foreground border-b font-mono text-[10px] font-bold uppercase tracking-wider">
                <th className="w-8 px-3 py-2.5"></th>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">Event</th>
                <th className="px-3 py-2.5">File</th>
                <th className="px-3 py-2.5">Language</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && <LoadingState label="Preparing your live event feed…" />}

        {isError && <ErrorState message="We couldn't reach the API. Retrying in the background…" />}

        {!isLoading && !isError && events.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No events yet"
              description="Save a file in an observed project and it will appear here instantly."
              footer={
                <span className="font-mono text-[11px]">
                  Tip: Ensure the DepRadar Daemon is running in your terminal.
                </span>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
