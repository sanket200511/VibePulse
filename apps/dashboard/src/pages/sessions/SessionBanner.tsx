import { Badge } from "@vibepulse/ui";
import { useCurrentSession } from "./useCurrentSession";

const STATUS_BADGE = {
  ACTIVE: { variant: "success" as const, label: "Active session" },
  IDLE: { variant: "warning" as const, label: "Idle" },
  COMPLETED: { variant: "default" as const, label: "Completed" },
};

/**
 * Compact banner shown on the Live Event Feed summarising the current
 * development session — metrics are read directly from the Session domain,
 * never re-derived here (see docs/adr/0005-session-engine.md).
 */
export function SessionBanner() {
  const { session, isLoading } = useCurrentSession();

  if (isLoading) return null;

  if (!session) {
    return (
      <div className="border-border bg-card mb-6 rounded-[12px] border px-4 py-3">
        <p className="text-muted-foreground text-sm">No active session yet.</p>
      </div>
    );
  }

  const status = STATUS_BADGE[session.status];
  const minutes = Math.round(session.duration_seconds / 60);

  return (
    <div className="border-border bg-card mb-6 flex items-center justify-between rounded-[12px] border px-4 py-3">
      <div className="flex items-center gap-3">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-foreground text-sm font-medium">{session.project_root}</span>
      </div>
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <span>{session.event_count} events</span>
        <span>{session.distinct_file_count} files</span>
        {session.primary_language && <span>{session.primary_language}</span>}
        <span>{minutes} min</span>
      </div>
    </div>
  );
}
