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
    <div className="animate-fade-in mb-4 flex w-full max-w-2xl flex-col gap-2 motion-reduce:animate-none">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
          Development Trail
        </span>
        <div className="bg-border h-px flex-1 opacity-50" />
      </div>

      {previousFrames.map(({ frame, distance }) => {
        // Calculate opacity based on distance (1 is closest)
        const opacity =
          distance === 1 ? "opacity-100" : distance === 2 ? "opacity-80" : "opacity-60";
        const scale =
          distance === 1 ? "scale-100" : distance === 2 ? "scale-[0.98]" : "scale-[0.95]";

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
            className={`flex flex-col ${opacity} ${scale} origin-top transform-gpu transition-all duration-500 motion-reduce:transform-none motion-reduce:transition-none`}
          >
            <div className="bg-card/40 hover:bg-card/60 border-border/40 flex w-full items-center gap-4 rounded-lg border p-2.5 px-4 transition-colors">
              <span className="text-secondary-text w-12 shrink-0 font-mono text-[10px]">
                {formatReplayTime(frame.timestamp)}
              </span>

              <div className="flex min-w-0 flex-1 items-center justify-between">
                <div className="flex items-center gap-3 truncate">
                  {isMarker ? (
                    <span className="text-success-color text-xs font-bold uppercase tracking-wide">
                      {fileName?.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-primary-text truncate text-sm font-medium">
                      {fileName}
                    </span>
                  )}

                  {!isMarker && frame.kind === "GROUP" && (
                    <span className="bg-muted-color/50 text-secondary-text rounded px-1.5 py-0.5 text-[9px] font-semibold">
                      +{frame.metadata.group_size}
                    </span>
                  )}
                </div>
                {!isMarker && (
                  <span className="text-muted-foreground ml-2 shrink-0 text-[9px] font-semibold uppercase tracking-wider">
                    {frame.metadata.event_type}
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {distance > 1 && (
              <div className="ml-8 flex justify-start">
                <div className="bg-border/60 my-0.5 h-3 w-px" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
