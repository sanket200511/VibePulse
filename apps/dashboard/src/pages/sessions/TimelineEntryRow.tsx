import { Badge } from "@vibepulse/ui";
import type { TimelineEntry } from "./timeline-types";

const EVENT_TYPE_GLYPH: Record<string, string> = {
  FILE_CREATED: "+",
  FILE_MODIFIED: "±",
  FILE_DELETED: "×",
};

const MARKER_LABEL: Record<string, string> = {
  SESSION_START: "Session started",
  SESSION_END: "Session ended",
  IDLE_GAP: "Idle",
  LANGUAGE_SWITCH: "Language switch",
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

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
    return (
      <li className="flex items-center gap-3 py-2 pl-11">
        <span className="border-border h-px flex-1 border-t border-dashed" />
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
          {entry.metadata.marker_detail ? ` — ${entry.metadata.marker_detail}` : ""}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {formatTime(entry.metadata.timestamp)}
        </span>
      </li>
    );
  }

  const glyph = entry.metadata.event_type ? EVENT_TYPE_GLYPH[entry.metadata.event_type] : "•";
  const findingCount = Object.keys(entry.insights.analyzer_findings).length;

  return (
    <li className="border-border flex items-center gap-3 border-b py-3 pl-4 last:border-0">
      <span
        className="bg-secondary text-secondary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm"
        aria-hidden="true"
      >
        {glyph}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-foreground truncate font-mono text-sm">
          {fileName(entry.metadata.file_path)}
        </span>

        {entry.entry_kind === "GROUP" && entry.metadata.group_size > 1 && (
          <Badge variant="secondary">×{entry.metadata.group_size}</Badge>
        )}

        {entry.metadata.language && <Badge variant="outline">{entry.metadata.language}</Badge>}

        {findingCount > 0 && (
          <Badge variant="default">
            {findingCount} finding{findingCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      <span className="text-muted-foreground shrink-0 font-mono text-xs">
        {formatTime(entry.metadata.timestamp)}
      </span>
    </li>
  );
}
