import { TimelineEntryRow } from "./TimelineEntryRow";
import type { TimelineEntry } from "./timeline-types";

export interface TimelineViewProps {
  entries: TimelineEntry[];
}

export function TimelineView({ entries }: TimelineViewProps) {
  if (entries.length === 0) {
    return (
      <p className="border-border/80 text-muted-foreground rounded-lg border border-dashed p-6 text-center font-mono text-xs">
        No events were recorded during this session.
      </p>
    );
  }

  return (
    <div className="relative pb-2">
      <div className="bg-border/80 pointer-events-none absolute bottom-3 left-[36px] top-3 z-0 w-px" />
      <ol className="relative z-10 flex w-full flex-col">
        {entries.map((entry) => (
          <TimelineEntryRow key={entry.id} entry={entry} />
        ))}
      </ol>
    </div>
  );
}
