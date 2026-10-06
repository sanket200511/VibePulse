import { Badge } from "@depradar/ui";
import type { TimelineEntry } from "./timeline-types";
import {
  FilePlus,
  FileCode,
  FileMinus,
  Play,
  Check,
  Coffee,
  Languages,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { formatReplayTime } from "./replay-time-utils";

const EVENT_TYPE_ICON = {
  FILE_CREATED: FilePlus,
  FILE_MODIFIED: FileCode,
  FILE_DELETED: FileMinus,
};

const MARKER_ICON = {
  SESSION_START: Play,
  SESSION_END: Check,
  IDLE_GAP: Coffee,
  LANGUAGE_SWITCH: Languages,
};

const MARKER_LABEL: Record<string, string> = {
  SESSION_START: "Session started",
  SESSION_END: "Session ended",
  IDLE_GAP: "Idle",
  LANGUAGE_SWITCH: "Language switch",
};

function fileName(filePath: string | null): string {
  if (!filePath) return "—";
  return filePath.split("/").pop() ?? filePath;
}

export interface TimelineEntryRowProps {
  entry: TimelineEntry;
}

export function TimelineEntryRow({ entry }: TimelineEntryRowProps) {
  if (entry.entry_kind === "MARKER") {
    const kind = entry.metadata.marker_kind;
    const label = kind ? MARKER_LABEL[kind] : "Marker";
    const Icon = kind ? MARKER_ICON[kind as keyof typeof MARKER_ICON] : Terminal;

    return (
      <li className="group relative flex items-center gap-4 py-3 transition-colors">
        <span className="text-muted-foreground w-12 shrink-0 text-right font-mono text-[10px] tabular-nums">
          {formatReplayTime(entry.metadata.timestamp)}
        </span>
        <div className="border-primary/30 bg-primary/10 text-primary shadow-xs relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex flex-col">
          <span className="text-foreground text-xs font-semibold">{label}</span>
          {entry.metadata.marker_detail && (
            <span className="text-muted-foreground font-mono text-[11px]">
              {entry.metadata.marker_detail}
            </span>
          )}
        </div>
      </li>
    );
  }

  const IconComponent =
    (entry.metadata.event_type
      ? EVENT_TYPE_ICON[entry.metadata.event_type as keyof typeof EVENT_TYPE_ICON]
      : null) || FileCode;

  const findingCount = Object.keys(entry.insights.analyzer_findings).length;

  const typeColors = {
    FILE_CREATED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    FILE_MODIFIED: "text-foreground bg-secondary/40 border-border/80",
    FILE_DELETED: "text-destructive bg-destructive/10 border-destructive/20",
  };

  const iconClass = entry.metadata.event_type
    ? typeColors[entry.metadata.event_type as keyof typeof typeColors] ||
      "text-foreground bg-secondary/40 border-border/80"
    : "text-foreground bg-secondary/40 border-border/80";

  return (
    <li className="hover:bg-secondary/30 group relative -mx-1.5 flex items-center gap-4 rounded-md px-2 py-2 transition-colors">
      <span className="text-muted-foreground/70 group-hover:text-foreground w-12 shrink-0 text-right font-mono text-[10px] tabular-nums transition-colors">
        {formatReplayTime(entry.metadata.timestamp)}
      </span>

      <div
        className={`shadow-xs relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${iconClass}`}
        aria-hidden="true"
      >
        <IconComponent className="h-3 w-3" />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="text-foreground group-hover:text-primary max-w-[55%] select-all truncate font-mono text-xs font-medium transition-colors">
          {fileName(entry.metadata.file_path)}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {entry.entry_kind === "GROUP" && entry.metadata.group_size > 1 && (
            <Badge
              variant="secondary"
              className="bg-secondary/50 text-muted-foreground font-mono text-[9px] font-semibold"
            >
              {entry.metadata.group_size} modifications
            </Badge>
          )}

          {entry.metadata.language && (
            <span className="border-border/60 bg-secondary/40 text-muted-foreground rounded-md border px-1.5 py-0.5 font-mono text-[9px]">
              {entry.metadata.language}
            </span>
          )}

          {findingCount > 0 && (
            <span className="flex select-none items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              {findingCount} {findingCount === 1 ? "finding" : "findings"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
