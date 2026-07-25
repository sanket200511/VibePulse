import { TimelineEntryRow } from "./TimelineEntryRow";
import type { TimelineEntry } from "./timeline-types";

export interface TimelineViewProps {
  entries: TimelineEntry[];
}

export function TimelineView({ entries }: TimelineViewProps) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
        No events were recorded during this session.
      </p>
    );
  }

  return (
    <div className="relative pb-4">
      <div className="bg-border/80 pointer-events-none absolute bottom-4 left-[39px] top-4 z-0 w-px" />
      <ol className="relative z-10 flex w-full flex-col">
        {entries.map((entry) => (
          <TimelineEntryRow key={entry.id} entry={entry} />
        ))}
      </ol>
    </div>
  );
}
