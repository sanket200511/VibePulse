import { Badge } from "@vibepulse/ui";
import { EventRow } from "./EventRow";
import { useEventsFeed } from "./useEventsFeed";

const STATUS_BADGE = {
  open: { variant: "success" as const, label: "Live" },
  connecting: { variant: "warning" as const, label: "Connecting…" },
  closed: { variant: "danger" as const, label: "Disconnected" },
};

export function EventsPage() {
  const { events, connectionStatus, isLoading, isError } = useEventsFeed();
  const status = STATUS_BADGE[connectionStatus];

  return (
    <main className="bg-background flex min-h-screen flex-col p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Live Event Feed</h1>
          <p className="text-muted-foreground text-sm">
            Real-time file activity observed across your project.
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </header>

      <div className="border-border bg-card overflow-hidden rounded-[16px] border">
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

        {isLoading && (
          <p className="text-muted-foreground p-8 text-center text-sm">Loading events…</p>
        )}

        {isError && (
          <p className="text-destructive p-8 text-center text-sm">
            Could not reach the API. Retrying in the background…
          </p>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No events yet. Save a file to see it appear here.
          </p>
        )}
      </div>
    </main>
  );
}
