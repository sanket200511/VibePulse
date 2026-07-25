import { Badge } from "@vibepulse/ui";
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
      <li className="group relative flex items-center gap-6 py-5 transition-all duration-200">
        <span className="text-secondary-text w-12 shrink-0 text-right font-mono text-[10px] tabular-nums">
          {formatReplayTime(entry.metadata.timestamp)}
        </span>
        <div className="bg-accent-color/10 border-background relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 shadow-sm">
          <Icon className="text-accent-color h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-primary-text text-sm font-bold">{label}</span>
          {entry.metadata.marker_detail && (
            <span className="text-secondary-text mt-0.5 text-xs">
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
    FILE_CREATED: "text-success-color bg-success-color/10 border-success-color/30",
    FILE_MODIFIED: "text-primary-text bg-muted-color border-border",
    FILE_DELETED: "text-destructive bg-destructive/10 border-destructive/30",
  };

  const iconClass = entry.metadata.event_type
    ? typeColors[entry.metadata.event_type as keyof typeof typeColors] ||
      "text-primary-text bg-muted-color border-border"
    : "text-primary-text bg-muted-color border-border";

  return (
    <li className="hover:bg-muted-color/10 group relative -mx-2 flex items-center gap-6 rounded-lg px-2 py-3 transition-all duration-200">
      <span className="text-secondary-text w-12 shrink-0 text-right font-mono text-[10px] tabular-nums opacity-60 transition-opacity group-hover:opacity-100">
        {formatReplayTime(entry.metadata.timestamp)}
      </span>

      <div
        className={`border-background relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 shadow-sm ${iconClass}`}
        aria-hidden="true"
      >
        <IconComponent className="h-3 w-3" />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className="text-primary-text group-hover:text-accent-color max-w-[50%] select-all truncate font-mono text-xs font-medium transition-colors">
          {fileName(entry.metadata.file_path)}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {entry.entry_kind === "GROUP" && entry.metadata.group_size > 1 && (
            <Badge
              variant="secondary"
              className="bg-muted-color/60 text-secondary-text rounded-md px-1.5 py-0.5 text-[9px] font-bold"
            >
              {entry.metadata.group_size} modifications
            </Badge>
          )}

          {entry.metadata.language && (
            <span className="bg-muted-color text-secondary-text border-border/50 select-none rounded-md border px-1.5 py-0.5 font-mono text-[9px]">
              {entry.metadata.language}
            </span>
          )}

          {findingCount > 0 && (
            <span className="bg-warning-color/15 text-warning-color border-warning-color/30 flex select-none items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              {findingCount} {findingCount === 1 ? "finding" : "findings"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
