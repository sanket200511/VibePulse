import { Button } from "@depradar/ui";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from "lucide-react";
import { Link } from "react-router-dom";
import type { UseReplayControllerResult, ReplaySpeed } from "./useReplayController";
import type { Replay } from "./replay-types";

import { formatReplayTime } from "./replay-time-utils";

interface ReplayControlsProps {
  controller: UseReplayControllerResult;
  replay: Replay;
}

const REPLAY_SPEEDS = [1, 2, 4, 8] as const;

export function ReplayControls({ controller, replay }: ReplayControlsProps) {
  const { currentIndex, currentChapter, isPlaying, speed, isAtStart, isAtEnd } = controller;

  return (
    <div className="relative flex w-full flex-col gap-6">
      {/* SCRUBBER & CHAPTER SEGMENTATION */}
      <div className="relative flex flex-col gap-2.5">
        <div className="bg-muted-color/40 border-border/40 relative flex h-3 w-full cursor-pointer overflow-hidden rounded-full border shadow-inner">
          {/* Render chapter segments as visual hints */}
          {replay.chapters.map((chapter) => {
            const totalFrames = Math.max(1, replay.frames.length - 1);
            const startPct = (chapter.start_frame_index / totalFrames) * 100;
            const widthPct =
              ((chapter.end_frame_index - chapter.start_frame_index) / totalFrames) * 100;
            const isCurrent = currentChapter?.id === chapter.id;

            // For chapters that are 0 frames wide (like SESSION_START), give them a tiny minimum width
            const finalWidth = widthPct < 0.5 ? 0.5 : widthPct;

            return (
              <div
                key={chapter.id}
                className={`border-background/20 absolute h-full border-r transition-colors ${isCurrent ? "bg-accent-color" : "bg-muted-color hover:bg-secondary-text/30"}`}
                style={{ left: `${startPct}%`, width: `${finalWidth}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  controller.jumpToChapter(chapter.id);
                }}
                title={chapter.label}
              />
            );
          })}

          {/* Progress Fill */}
          <div
            className="bg-accent-color/30 pointer-events-none absolute h-full mix-blend-multiply dark:mix-blend-screen"
            style={{ width: `${(currentIndex / Math.max(1, replay.frames.length - 1)) * 100}%` }}
          />

          {/* Playhead dot */}
          <div
            className="bg-foreground pointer-events-none absolute top-1/2 z-10 -mt-1.5 h-3 w-3 rounded-full shadow-sm transition-all"
            style={{
              left: `calc(${(currentIndex / Math.max(1, replay.frames.length - 1)) * 100}% - 6px)`,
            }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(replay.frames.length - 1, 0)}
          value={currentIndex}
          onChange={(event) => controller.jumpToFrame(Number(event.target.value))}
          className="absolute left-0 top-0 z-20 h-3 w-full cursor-pointer opacity-0"
          aria-label="Scrub replay"
          aria-valuetext={`Frame ${currentIndex + 1} of ${replay.frames.length}`}
        />

        <div className="text-muted-foreground flex items-center justify-between px-1 font-mono text-[10px]">
          <span>
            {replay.frames.length > 0
              ? formatReplayTime(replay.frames[0]?.timestamp || 0)
              : "Start"}
          </span>
          <span>
            {replay.frames.length > 0
              ? formatReplayTime(replay.frames[replay.frames.length - 1]?.timestamp || 0)
              : "End"}
          </span>
        </div>
      </div>

      {/* MAIN CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={controller.restart}
            aria-label="Restart"
            title="Restart"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div className="bg-muted-color/30 border-border flex items-center gap-1 rounded-full border p-1 shadow-sm">
            <button
              className="hover:bg-card text-primary-text flex h-8 w-8 items-center justify-center rounded-full transition-all hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none"
              onClick={controller.prev}
              disabled={isAtStart}
              aria-label="Previous frame"
              title="Previous Frame"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all hover:opacity-90"
              onClick={isPlaying ? controller.pause : controller.play}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
            <button
              className="hover:bg-card text-primary-text flex h-8 w-8 items-center justify-center rounded-full transition-all hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none"
              onClick={controller.next}
              disabled={isAtEnd}
              aria-label="Next frame"
              title="Next Frame"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Chapter Navigation Chips (Desktop/Tablet) */}
        <div className="no-scrollbar mask-edges hidden flex-1 items-center gap-2 overflow-x-auto px-4 md:flex">
          {replay.chapters.map((chapter) => {
            const isCurrent = currentChapter?.id === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => controller.jumpToChapter(chapter.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${isCurrent ? "bg-accent-color ring-accent-color/50 text-white shadow-md ring-1" : "text-secondary-text hover:bg-muted-color hover:border-border border border-transparent bg-transparent"}`}
              >
                {chapter.label}
              </button>
            );
          })}
        </div>

        <div className="bg-muted-color/20 border-border ml-auto flex items-center gap-1 rounded-lg border p-1">
          <FastForward className="text-muted-foreground ml-1 mr-1.5 hidden h-3 w-3 sm:block" />
          {REPLAY_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => controller.setSpeed(s as ReplaySpeed)}
              aria-pressed={speed === s}
              className={`h-6 rounded px-2 font-mono text-[10px] font-bold transition-all ${speed === s ? "bg-card border-border text-primary-text border shadow-sm" : "text-muted-foreground hover:text-primary-text bg-transparent"}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Completion Overlay */}
      {controller.didFinish && (
        <div className="bg-background/80 animate-fade-in absolute inset-0 z-50 -mx-6 -my-4 flex items-center justify-center backdrop-blur-sm motion-reduce:animate-none">
          <div className="bg-card border-border flex w-full max-w-sm scale-100 transform flex-col items-center gap-5 rounded-2xl border p-6 text-center shadow-lg transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none">
            <div className="bg-accent-color/10 text-accent-color mb-1 flex h-12 w-12 items-center justify-center rounded-full">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-primary-text text-xl font-bold tracking-tight">
                Session Complete
              </h3>
              <p className="text-secondary-text text-sm">
                You have reached the end of this replay.
              </p>
            </div>
            <div className="mt-2 flex w-full flex-col gap-3">
              <Button
                onClick={controller.restart}
                variant="primary"
                className="h-10 w-full font-semibold"
              >
                Watch Again
              </Button>
              <Link
                to={`/sessions/${replay.session_id}`}
                className="focus-visible:ring-ring hover:bg-muted hover:text-accent-foreground border-border text-secondary-text inline-flex h-10 w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
              >
                Back to Session
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
