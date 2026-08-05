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
import { Badge } from "@vibepulse/ui";
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
    <div className="border-border/50 relative ml-4 flex flex-col gap-6 border-l-2 pb-6 pl-6 pt-2">
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
            className="border-border bg-card relative flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Timeline dot */}
            <div
              className={`border-background absolute -left-[35px] top-6 h-4 w-4 rounded-full border-4 ${meta.bg.replace("/10", "")}`}
            />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${meta.bg} ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{entry.title}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                    className="text-accent-color bg-accent-color/10 flex items-center gap-1 rounded px-2 py-1 text-xs hover:underline"
                    title="Jump to Replay"
                  >
                    <Play className="h-3 w-3" />
                    Replay
                  </Link>
                )}
                {projectId && (
                  <Link
                    to={`/projects/${projectId}`}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 text-xs hover:underline"
                    title="Jump to Project"
                  >
                    Project
                  </Link>
                )}
              </div>
            </div>

            {entry.description && (
              <div className="bg-muted/30 text-muted-foreground mt-2 overflow-x-auto whitespace-pre rounded p-3 font-mono text-xs">
                {entry.description}
              </div>
            )}

            {entry.related_file && (
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <span className="text-foreground font-medium">File:</span>
                <span className="font-mono">{entry.related_file}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
