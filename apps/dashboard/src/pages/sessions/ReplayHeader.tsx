import { Badge } from "@vibepulse/ui";
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
    <div className="border-border bg-card flex items-center justify-between border-b px-6 py-4 transition-colors">
      <div className="flex items-center gap-4">
        <div className="bg-accent-color/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          {isPlaying ? (
            <PlayCircle className="text-accent-color h-4 w-4 animate-pulse" />
          ) : (
            <PauseCircle className="text-muted-foreground h-4 w-4" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="text-primary-text shrink-0 text-sm font-bold tracking-tight">
              Session Replay
            </span>
            {currentChapter && (
              <Badge variant="secondary" className="truncate text-[9px] uppercase tracking-wider">
                {CHAPTER_KIND_LABEL[currentChapter.kind] ?? currentChapter.kind}
              </Badge>
            )}
          </div>
          <span className="text-secondary-text mt-0.5 truncate text-xs">
            {currentChapter?.label ?? "Initializing..."}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <div className="hidden flex-col items-end md:flex">
          <span className="text-secondary-text text-[9px] font-bold uppercase tracking-wider">
            Time
          </span>
          <span className="text-primary-text mt-0.5 flex items-center gap-1.5 font-mono text-xs">
            <Clock className="text-accent-color h-3.5 w-3.5" />
            {currentFrame ? formatReplayTime(currentFrame.timestamp) : "--:--"}
          </span>
        </div>
        <div className="hidden flex-col items-end sm:flex">
          <span className="text-secondary-text text-[9px] font-bold uppercase tracking-wider">
            Progress
          </span>
          <span className="text-primary-text mt-0.5 flex items-center gap-1.5 font-mono text-xs">
            <Layers className="text-accent-color h-3.5 w-3.5" />
            {progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
