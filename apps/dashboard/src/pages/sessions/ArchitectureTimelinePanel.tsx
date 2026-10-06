import { Link } from "react-router-dom";
import {
  Play,
  Code2,
  ShieldAlert,
  GitCommit,
  FilePlus,
  Minus,
  Plus,
  Text,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import type { ArchitectureTimeline } from "./useSessionArchitectureTimeline";

const KIND_METADATA: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  FUNCTION_ADDED: { icon: Plus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  FUNCTION_REMOVED: { icon: Minus, color: "text-rose-500", bg: "bg-rose-500/10" },
  CLASS_ADDED: { icon: Plus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  CLASS_REMOVED: { icon: Minus, color: "text-rose-500", bg: "bg-rose-500/10" },
  IMPORT_INTRODUCED: { icon: Plus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  IMPORT_REMOVED: { icon: Minus, color: "text-rose-500", bg: "bg-rose-500/10" },
  TODO_INTRODUCED: { icon: Text, color: "text-amber-500", bg: "bg-amber-500/10" },
  TODO_RESOLVED: { icon: Text, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  FILE_CREATED: { icon: FilePlus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  FILE_DELETED: { icon: Minus, color: "text-rose-500", bg: "bg-rose-500/10" },
  FILE_EXPANDED: { icon: Code2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  FILE_SHRANK: { icon: Code2, color: "text-amber-500", bg: "bg-amber-500/10" },
  SECURITY_FINDING: { icon: ShieldAlert, color: "text-rose-500", bg: "bg-rose-500/10" },
  SESSION_START: { icon: GitCommit, color: "text-blue-500", bg: "bg-blue-500/10" },
  SESSION_END: { icon: GitCommit, color: "text-purple-500", bg: "bg-purple-500/10" },
};

export function ArchitectureTimelinePanel({
  timeline,
  projectId,
}: {
  timeline: ArchitectureTimeline;
  projectId?: string | undefined;
}) {
  return (
    <div className="border-border/80 relative ml-3 flex flex-col gap-4 border-l pb-4 pl-5 pt-1">
      {timeline.entries.map((entry) => {
        const meta = KIND_METADATA[entry.kind] || {
          icon: GitCommit,
          color: "text-muted-foreground",
          bg: "bg-muted",
        };
        const Icon = meta.icon;

        return (
          <div
            key={entry.id}
            className="border-border/80 bg-card/60 shadow-xs hover:border-primary/40 hover:bg-card/90 relative flex flex-col gap-2 rounded-lg border p-3.5 transition-colors"
          >
            {/* Timeline dot */}
            <div
              className={`border-background absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 ${meta.bg.replace("/10", "")}`}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-md p-1.5 ${meta.bg} ${meta.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-xs font-semibold">{entry.title}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {entry.severity && (
                  <Badge
                    variant={
                      entry.severity === "HIGH"
                        ? "danger"
                        : entry.severity === "MEDIUM"
                          ? "warning"
                          : "default"
                    }
                  >
                    {entry.severity}
                  </Badge>
                )}
                {entry.related_event_id && (
                  <Link
                    to={`/sessions/${timeline.session_id}/replay?event=${entry.related_event_id}`}
                    className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors"
                    title="Jump to Replay"
                  >
                    <Play className="h-2.5 w-2.5" />
                    Replay
                  </Link>
                )}
                {projectId && (
                  <Link
                    to={`/projects/${projectId}`}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono text-[10px] transition-colors hover:underline"
                    title="Jump to Project"
                  >
                    Project
                  </Link>
                )}
              </div>
            </div>

            {entry.description && (
              <div className="border-border/60 bg-secondary/30 text-muted-foreground mt-1 overflow-x-auto whitespace-pre rounded-md border p-2.5 font-mono text-[11px]">
                {entry.description}
              </div>
            )}

            {entry.related_file && (
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-foreground font-medium">File:</span>
                <span>{entry.related_file}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
