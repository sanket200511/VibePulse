import type { UseReplayControllerResult } from "./useReplayController";
import type { ReplayFrame } from "./replay-types";

import { formatReplayTime } from "./replay-time-utils";

interface ReplayTrailProps {
  controller: UseReplayControllerResult;
  frames: ReplayFrame[];
}

export function ReplayTrail({ controller, frames }: ReplayTrailProps) {
  const { currentIndex } = controller;

  // Get up to 3 previous frames
  const previousFrames = [];
  for (let i = Math.max(0, currentIndex - 3); i < currentIndex; i++) {
    const frame = frames[i];
    if (frame) {
      previousFrames.push({ frame, distance: currentIndex - i });
    }
  }

  if (previousFrames.length === 0) return null;

  return (
    <div className="animate-fade-in mb-3 flex w-full max-w-2xl flex-col gap-1.5 motion-reduce:animate-none">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
          Development Trail
        </span>
        <div className="bg-border/80 h-px flex-1" />
      </div>

      {previousFrames.map(({ frame, distance }) => {
        // Calculate opacity based on distance (1 is closest)
        const opacity =
          distance === 1 ? "opacity-100" : distance === 2 ? "opacity-75" : "opacity-50";
        const scale =
          distance === 1 ? "scale-100" : distance === 2 ? "scale-[0.99]" : "scale-[0.97]";

        const pathParts = frame.metadata.file_path ? frame.metadata.file_path.split("/") : [];
        const fileName =
          pathParts.pop() ||
          (frame.kind === "MARKER"
            ? frame.metadata.marker_kind?.replace(/_/g, " ")
            : "Unknown context");
        const isMarker = frame.kind === "MARKER";

        return (
          <div
            key={frame.id}
            className={`flex flex-col ${opacity} ${scale} origin-top transform-gpu transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none`}
          >
            <div className="border-border/70 bg-card/50 hover:border-primary/40 hover:bg-card/80 flex w-full items-center gap-3 rounded-md border px-3 py-1.5 transition-colors">
              <span className="text-muted-foreground w-12 shrink-0 font-mono text-[10px] tabular-nums">
                {formatReplayTime(frame.timestamp)}
              </span>

              <div className="flex min-w-0 flex-1 items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  {isMarker ? (
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                      {fileName?.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-foreground truncate font-mono text-xs font-medium">
                      {fileName}
                    </span>
                  )}

                  {!isMarker && frame.kind === "GROUP" && (
                    <span className="border-border/60 bg-secondary/40 text-muted-foreground rounded border px-1 py-0.5 font-mono text-[9px] font-semibold">
                      +{frame.metadata.group_size}
                    </span>
                  )}
                </div>
                {!isMarker && (
                  <span className="text-muted-foreground ml-2 shrink-0 font-mono text-[9px] font-semibold uppercase tracking-wider">
                    {frame.metadata.event_type}
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {distance > 1 && (
              <div className="ml-6 flex justify-start">
                <div className="bg-border/60 my-0.5 h-2 w-px" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
