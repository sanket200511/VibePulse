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
      <div className="text-secondary-text animate-fade-in-up border-border/50 bg-card/30 rounded-2xl border p-12 text-center text-sm font-medium motion-reduce:animate-none">
        🎞️ Nothing to replay for this session yet.
      </div>
    );
  }

  return (
    <div
      className="bg-background border-border flex w-full flex-col overflow-hidden rounded-[20px] border shadow-sm transition-all duration-300 motion-reduce:transition-none"
      tabIndex={0}
      role="group"
      aria-label="Session replay player"
      onKeyDown={handleKeyDown}
    >
      <ReplayHeader controller={controller} replay={replay} />

      <div className="bg-card relative flex flex-col">
        <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center overflow-hidden p-6 md:p-8 lg:min-h-[500px] lg:p-12">
          <div className="flex w-full max-w-4xl flex-col">
            <ReplayTrail controller={controller} frames={replay.frames} />
            <ReplayFocusStage controller={controller} />
          </div>
        </div>
      </div>

      <div className="bg-card border-border z-10 border-t p-5 pb-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:p-6">
        <ReplayControls controller={controller} replay={replay} />
      </div>
    </div>
  );
}
