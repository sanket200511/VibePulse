import { Badge } from "@vibepulse/ui";
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
    <div className="flex flex-1 flex-col p-8">
      <PageHeader
        title="Live Event Feed"
        description="Real-time file activity observed across your project."
        meta={<Badge variant={status.variant}>{status.label}</Badge>}
      />

      <SessionBanner />

      <div className="border-border bg-card overflow-hidden rounded-[16px] border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Language</th>
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
          <EmptyState
            title="No events yet"
            description="Save a file in an observed project and it will appear here."
          />
        )}
      </div>
    </div>
  );
}
