import { useCallback } from "react";
import { useReplayController } from "./useReplayController";
import type { Replay } from "./replay-types";

import { ReplayHeader } from "./ReplayHeader";
import { ReplayTrail } from "./ReplayTrail";
import { ReplayFocusStage } from "./ReplayFocusStage";
import { ReplayControls } from "./ReplayControls";

export interface ReplayViewProps {
  replay: Replay;
}

export function ReplayView({ replay }: ReplayViewProps) {
  const controller = useReplayController(replay.frames, replay.chapters);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Ignore if event comes from an input element
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) {
        return;
      }

      switch (event.key) {
        case " ":
          event.preventDefault();
          if (controller.isPlaying) controller.pause();
          else controller.play();
          break;
        case "ArrowLeft":
          event.preventDefault();
          controller.prev();
          break;
        case "ArrowRight":
          event.preventDefault();
          controller.next();
          break;
        case "Home":
          event.preventDefault();
          controller.restart();
          break;
      }
    },
    [controller],
  );

  if (replay.frames.length === 0) {
    return (
      <div className="animate-fade-in-up border-border/80 bg-card/40 text-muted-foreground rounded-lg border border-dashed p-8 text-center font-mono text-xs motion-reduce:animate-none">
        Nothing to replay for this session yet.
      </div>
    );
  }

  return (
    <div
      className="border-border/80 bg-card/60 shadow-xs flex w-full flex-col overflow-hidden rounded-lg border transition-colors"
      tabIndex={0}
      role="group"
      aria-label="Session replay player"
      onKeyDown={handleKeyDown}
    >
      <ReplayHeader controller={controller} replay={replay} />

      <div className="bg-background/50 relative flex flex-col">
        <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center overflow-hidden p-4 sm:p-6 md:p-8 lg:min-h-[440px]">
          <div className="flex w-full max-w-4xl flex-col">
            <ReplayTrail controller={controller} frames={replay.frames} />
            <ReplayFocusStage controller={controller} />
          </div>
        </div>
      </div>

      <div
        data-tour="replay-scrubber"
        className="border-border/80 bg-card/90 shadow-xs z-10 border-t p-4 sm:p-5"
      >
        <ReplayControls controller={controller} replay={replay} />
      </div>
    </div>
  );
}
