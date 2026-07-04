import { Badge } from "@vibepulse/ui";
import { SessionRow } from "./SessionRow";
import { useSessionsData } from "./useSessionsData";

const STATUS_BADGE = {
  open: { variant: "success" as const, label: "Live" },
  connecting: { variant: "warning" as const, label: "Connecting…" },
  closed: { variant: "danger" as const, label: "Disconnected" },
};

export function SessionsPage() {
  const { sessions, connectionStatus, isLoading, isError } = useSessionsData();
  const status = STATUS_BADGE[connectionStatus];

  return (
    <main className="bg-background flex min-h-screen flex-col p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground text-sm">
            Development sessions observed across your projects.
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </header>

      <div className="border-border bg-card overflow-hidden rounded-[16px] border">
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

        {isLoading && (
          <p className="text-muted-foreground p-8 text-center text-sm">Loading sessions…</p>
        )}

        {isError && (
          <p className="text-destructive p-8 text-center text-sm">
            Could not reach the API. Retrying in the background…
          </p>
        )}

        {!isLoading && !isError && sessions.length === 0 && (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No sessions yet. Start coding to see one appear here.
          </p>
        )}
      </div>
    </main>
  );
}
