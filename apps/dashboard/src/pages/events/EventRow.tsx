import { Badge } from "@vibepulse/ui";
import type { DevelopmentEvent } from "./types";

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

  return (
    <tr className="border-border border-b last:border-0">
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
  );
}
