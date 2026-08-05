import { Badge } from "@vibepulse/ui";
import { useState } from "react";
import type { DevelopmentEvent } from "./types";
import { EventAnalysisDetails } from "./EventAnalysisDetails";
import { ChevronDown, ChevronRight } from "lucide-react";

const EVENT_BADGE_VARIANT = {
  FILE_CREATED: "success",
  FILE_MODIFIED: "default",
  FILE_DELETED: "danger",
} as const;

const EVENT_LABEL = {
  FILE_CREATED: "Created",
  FILE_MODIFIED: "Modified",
  FILE_DELETED: "Deleted",
} as const;

export interface EventRowProps {
  event: DevelopmentEvent;
}

export function EventRow({ event }: EventRowProps) {
  const time = new Date(event.timestamp).toLocaleTimeString();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-border hover:bg-muted/50 cursor-pointer border-b transition-colors last:border-0"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="text-muted-foreground px-4 py-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="text-muted-foreground whitespace-nowrap px-4 py-2 font-mono text-xs">
          {time}
        </td>
        <td className="px-4 py-2">
          <Badge variant={EVENT_BADGE_VARIANT[event.event_type]}>
            {EVENT_LABEL[event.event_type]}
          </Badge>
        </td>
        <td className="text-foreground px-4 py-2 font-mono text-sm">{event.file_path}</td>
        <td className="text-muted-foreground px-4 py-2 text-sm">{event.language ?? "—"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="border-border border-b p-0">
            <EventAnalysisDetails eventId={event.id} />
          </td>
        </tr>
      )}
    </>
  );
}
