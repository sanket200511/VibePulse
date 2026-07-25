import { Link } from "react-router-dom";
import type { Session } from "./types";
import { Clock, Layers } from "lucide-react";

const STATUS_BADGE = {
  ACTIVE: {
    variant: "success" as const,
    label: "Active",
    className: "bg-success-color/10 text-success-color border-success-color/20",
  },
  IDLE: {
    variant: "warning" as const,
    label: "Idle",
    className: "bg-warning-color/10 text-warning-color border-warning-color/20",
  },
  COMPLETED: {
    variant: "default" as const,
    label: "Completed",
    className: "bg-muted-color/15 text-secondary-text border-border",
  },
};

export interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const status = STATUS_BADGE[session.status];
  const started = new Date(session.started_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const minutes = Math.round(session.duration_seconds / 60);

  // Extract project name from root path
  const projectName = session.project_root.split(/[\\/]/).pop() || session.project_root;

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="bg-card border-border hover:border-accent-color/30 group flex cursor-pointer flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">
            {started}
          </span>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <h3 className="text-primary-text group-hover:text-accent-color mt-3 truncate text-base font-semibold transition-colors">
          {projectName}
        </h3>
        <p className="text-secondary-text selection:bg-selection-color mt-1 truncate font-mono text-[10px]">
          {session.project_root}
        </p>

        {session.summary?.headline ? (
          <p className="text-secondary-text border-accent-color/20 mt-3.5 border-l-2 pl-3 text-xs italic leading-relaxed">
            &ldquo;{session.summary.headline}&rdquo;
          </p>
        ) : (
          <p className="text-muted-foreground/60 mt-3.5 text-xs italic leading-relaxed">
            No summary generated for this session.
          </p>
        )}
      </div>

      <div className="border-border text-secondary-text mt-5 flex items-center justify-between border-t pt-4 text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="text-accent-color/70 h-3.5 w-3.5" />
            <span>{minutes} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="text-accent-color/70 h-3.5 w-3.5" />
            <span>{session.event_count} events</span>
          </div>
        </div>

        <div className="bg-muted-color/30 border-border flex items-center gap-1.5 rounded border px-2 py-0.5">
          <span className="bg-accent-color h-1.5 w-1.5 rounded-full" />
          <span className="text-primary-text font-medium">
            {session.primary_language ?? "Unknown"}
          </span>
        </div>
      </div>
    </Link>
  );
}
