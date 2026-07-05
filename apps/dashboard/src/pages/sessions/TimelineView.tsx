import { TimelineEntryRow } from "./TimelineEntryRow";
import type { TimelineEntry } from "./timeline-types";

export interface TimelineViewProps {
  entries: TimelineEntry[];
}

export function TimelineView({ entries }: TimelineViewProps) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground p-8 text-center text-sm">
        No events were recorded during this session.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry) => (
        <TimelineEntryRow key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}
