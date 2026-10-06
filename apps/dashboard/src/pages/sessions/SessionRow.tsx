import { Link } from "react-router-dom";
import type { Session } from "./types";
import { Clock, Layers, ChevronRight, GitBranch } from "lucide-react";

const STATUS_BADGE = {
  ACTIVE: {
    label: "ACTIVE",
    dotClass: "bg-emerald-500 animate-pulse",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  IDLE: {
    label: "IDLE",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  COMPLETED: {
    label: "COMPLETED",
    dotClass: "bg-muted-foreground/50",
    badgeClass: "bg-secondary/60 text-muted-foreground border-border/80",
  },
};

export interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const status = STATUS_BADGE[session.status] || STATUS_BADGE.COMPLETED;

  const startedDate = new Date(session.started_at);
  const timeFormatted = startedDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateFormatted = startedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

  const minutes = Math.round(session.duration_seconds / 60);
  const projectName = session.project_root.split(/[\\/]/).pop() || session.project_root;

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="border-border/40 bg-card/40 hover:border-border/80 hover:bg-muted/30 group relative mb-0.5 flex items-center justify-between gap-3 rounded-sm border-b px-3.5 py-2.5 font-sans text-xs transition-colors"
    >
      {/* Subtle hover accent on left edge */}
      <div className="group-hover:bg-primary/80 absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-r bg-transparent transition-colors" />

      {/* Main Column Grid */}
      <div className="grid flex-1 grid-cols-12 items-center gap-2 pl-1.5 sm:gap-4">
        {/* 1. Status Column */}
        <div className="col-span-4 flex items-center gap-2 sm:col-span-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dotClass}`} />
          <span
            className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider ${status.badgeClass}`}
          >
            {status.label}
          </span>
        </div>

        {/* 2. Project Name & Path / Branch Column */}
        <div className="col-span-8 flex min-w-0 flex-col justify-center sm:col-span-3">
          <div className="flex items-center gap-2 truncate">
            <span className="text-foreground group-hover:text-primary truncate font-mono text-xs font-semibold transition-colors">
              {projectName}
            </span>
            {session.git_branch && (
              <span className="text-muted-foreground/70 hidden shrink-0 items-center gap-1 font-mono text-[10px] md:inline-flex">
                <GitBranch className="text-muted-foreground/50 h-2.5 w-2.5" />
                {session.git_branch}
              </span>
            )}
          </div>
          <div className="text-muted-foreground/60 flex items-center gap-1 truncate font-mono text-[10px]">
            <span className="truncate" title={session.project_root}>
              {session.project_root}
            </span>
            {session.summary?.headline && (
              <span
                className="text-muted-foreground/80 truncate font-sans"
                title={session.summary.headline}
              >
                — {session.summary.headline}
              </span>
            )}
          </div>
        </div>

        {/* 3. Time Column */}
        <div className="text-muted-foreground col-span-2 hidden items-center gap-1.5 font-mono text-xs tabular-nums sm:flex">
          <span className="text-muted-foreground/70">{dateFormatted},</span>
          <span className="text-foreground/90 font-medium">{timeFormatted}</span>
        </div>

        {/* 4. Events Column */}
        <div className="text-muted-foreground col-span-2 hidden items-center gap-1.5 font-mono text-xs tabular-nums md:flex">
          <Layers className="text-muted-foreground/50 h-3 w-3 shrink-0" />
          <span>
            {session.event_count} {session.event_count === 1 ? "event" : "events"}
          </span>
        </div>

        {/* 5. Duration Column */}
        <div className="text-muted-foreground col-span-2 hidden items-center gap-1.5 font-mono text-xs tabular-nums lg:flex">
          <Clock className="text-muted-foreground/50 h-3 w-3 shrink-0" />
          <span>{minutes} min</span>
        </div>

        {/* 6. Primary Language Column */}
        <div className="col-span-1 hidden items-center justify-end sm:flex sm:justify-start">
          <span className="border-border/60 bg-secondary/40 text-muted-foreground inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
            {session.primary_language ?? "Unknown"}
          </span>
        </div>
      </div>

      {/* Action Chevron */}
      <div className="text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors">
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
