import { Badge } from "@depradar/ui";
import { Clock, Layers, PlayCircle, PauseCircle } from "lucide-react";
import type { UseReplayControllerResult } from "./useReplayController";
import type { Replay } from "./replay-types";

import { formatReplayTime } from "./replay-time-utils";

interface ReplayHeaderProps {
  controller: UseReplayControllerResult;
  replay: Replay;
}

const CHAPTER_KIND_LABEL: Record<string, string> = {
  SESSION_STARTED: "Started",
  WORK: "Work",
  IDLE: "Idle",
  RESUMED: "Resumed",
  SESSION_COMPLETED: "Completed",
};

export function ReplayHeader({ controller, replay }: ReplayHeaderProps) {
  const { currentChapter, currentFrame, currentIndex, isPlaying } = controller;

  const progressPercent =
    replay.frames.length > 0 ? Math.round(((currentIndex + 1) / replay.frames.length) * 100) : 0;

  return (
    <div className="border-border/80 bg-card/80 flex items-center justify-between border-b px-4 py-2.5 transition-colors sm:px-5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          {isPlaying ? (
            <PlayCircle className="text-primary h-4 w-4 animate-pulse" />
          ) : (
            <PauseCircle className="text-muted-foreground h-4 w-4" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="text-foreground shrink-0 text-xs font-bold">Session Replay</span>
            {currentChapter && (
              <Badge
                variant="outline"
                className="border-border/70 bg-secondary/40 text-muted-foreground truncate font-mono text-[9px] uppercase tracking-wider"
              >
                {CHAPTER_KIND_LABEL[currentChapter.kind] ?? currentChapter.kind}
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
            {currentChapter?.label ?? "Initializing..."}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 font-mono text-xs sm:gap-6">
        <div className="hidden flex-col items-end md:flex">
          <span className="text-muted-foreground font-mono text-[9px] font-bold uppercase tracking-wider">
            Time
          </span>
          <span className="text-foreground mt-0.5 flex items-center gap-1 tabular-nums">
            <Clock className="text-primary h-3 w-3" />
            {currentFrame ? formatReplayTime(currentFrame.timestamp) : "--:--"}
          </span>
        </div>
        <div className="hidden flex-col items-end sm:flex">
          <span className="text-muted-foreground font-mono text-[9px] font-bold uppercase tracking-wider">
            Progress
          </span>
          <span className="text-foreground mt-0.5 flex items-center gap-1 tabular-nums">
            <Layers className="text-primary h-3 w-3" />
            {progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
