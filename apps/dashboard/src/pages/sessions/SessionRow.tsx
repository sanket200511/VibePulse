import { Link } from "react-router-dom";
import { Badge } from "@vibepulse/ui";
import type { Session } from "./types";

const STATUS_BADGE = {
  ACTIVE: { variant: "success" as const, label: "Active" },
  IDLE: { variant: "warning" as const, label: "Idle" },
  COMPLETED: { variant: "default" as const, label: "Completed" },
};

export interface SessionRowProps {
  session: Session;
}

export function SessionRow({ session }: SessionRowProps) {
  const status = STATUS_BADGE[session.status];
  const started = new Date(session.started_at).toLocaleTimeString();
  const minutes = Math.round(session.duration_seconds / 60);

  return (
    <tr className="border-border border-b last:border-0">
      <td className="text-muted-foreground whitespace-nowrap px-4 py-2 font-mono text-xs">
        <Link to={`/sessions/${session.id}`} className="hover:underline">
          {started}
        </Link>
      </td>
      <td className="px-4 py-2">
        <Badge variant={status.variant}>{status.label}</Badge>
      </td>
      <td className="text-foreground px-4 py-2 font-mono text-sm">{session.project_root}</td>
      <td className="text-muted-foreground px-4 py-2 text-sm">{session.primary_language ?? "—"}</td>
      <td className="text-muted-foreground px-4 py-2 text-sm">{session.event_count}</td>
      <td className="text-muted-foreground px-4 py-2 text-sm">{session.distinct_file_count}</td>
      <td className="text-muted-foreground px-4 py-2 text-sm">{minutes} min</td>
      <td className="text-foreground px-4 py-2 text-sm">{session.summary?.headline ?? "—"}</td>
    </tr>
  );
}
