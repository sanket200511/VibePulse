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
    <div className="relative flex w-full flex-col gap-4">
      {/* SCRUBBER & CHAPTER SEGMENTATION */}
      <div className="relative flex flex-col gap-1.5">
        <div className="border-border/80 bg-secondary/50 relative flex h-2.5 w-full cursor-pointer overflow-hidden rounded-full border shadow-inner">
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
                className={`border-background/20 absolute h-full border-r transition-colors ${isCurrent ? "bg-primary" : "bg-muted-foreground/20 hover:bg-muted-foreground/35"}`}
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
            className="bg-primary/30 pointer-events-none absolute h-full"
            style={{ width: `${(currentIndex / Math.max(1, replay.frames.length - 1)) * 100}%` }}
          />

          {/* Playhead dot */}
          <div
            className="bg-primary shadow-xs pointer-events-none absolute top-1/2 z-10 -mt-1.5 h-3 w-3 rounded-full transition-all"
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
          className="absolute left-0 top-0 z-20 h-2.5 w-full cursor-pointer opacity-0"
          aria-label="Scrub replay"
          aria-valuetext={`Frame ${currentIndex + 1} of ${replay.frames.length}`}
        />

        <div className="text-muted-foreground flex items-center justify-between px-0.5 font-mono text-[10px]">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={controller.restart}
            aria-label="Restart"
            title="Restart"
            className="h-7 w-7 p-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <div className="border-border/80 bg-secondary/40 flex items-center gap-1 rounded-md border p-0.5">
            <button
              className="text-foreground hover:bg-card flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-40"
              onClick={controller.prev}
              disabled={isAtStart}
              aria-label="Previous frame"
              title="Previous Frame"
            >
              <SkipBack className="h-3 w-3" />
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-7 w-7 items-center justify-center rounded transition-colors"
              onClick={isPlaying ? controller.pause : controller.play}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
              )}
            </button>
            <button
              className="text-foreground hover:bg-card flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-40"
              onClick={controller.next}
              disabled={isAtEnd}
              aria-label="Next frame"
              title="Next Frame"
            >
              <SkipForward className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Chapter Navigation Chips (Desktop/Tablet) */}
        <div className="hidden flex-1 items-center gap-1.5 overflow-x-auto px-2 md:flex">
          {replay.chapters.map((chapter) => {
            const isCurrent = currentChapter?.id === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => controller.jumpToChapter(chapter.id)}
                className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                  isCurrent
                    ? "border-primary/40 bg-primary/10 text-primary border"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground border"
                }`}
              >
                {chapter.label}
              </button>
            );
          })}
        </div>

        <div className="border-border/80 bg-secondary/30 ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <FastForward className="text-muted-foreground ml-1 mr-1 hidden h-3 w-3 sm:block" />
          {REPLAY_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => controller.setSpeed(s as ReplaySpeed)}
              aria-pressed={speed === s}
              className={`h-6 rounded px-1.5 font-mono text-[10px] font-semibold transition-colors ${
                speed === s
                  ? "border-border/80 bg-card text-primary shadow-xs border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Completion Overlay */}
      {controller.didFinish && (
        <div className="bg-background/85 backdrop-blur-xs absolute inset-0 z-50 -mx-4 -my-4 flex items-center justify-center rounded-lg">
          <div className="border-border/80 bg-card flex w-full max-w-sm flex-col items-center gap-3.5 rounded-lg border p-5 text-center shadow-xl">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-full">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-foreground text-sm font-bold">Session Complete</h3>
              <p className="text-muted-foreground font-mono text-xs">
                You have reached the end of this replay.
              </p>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <Button
                onClick={controller.restart}
                variant="primary"
                className="h-8 w-full text-xs font-semibold"
              >
                Watch Again
              </Button>
              <Link
                to={`/sessions/${replay.session_id}`}
                className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary inline-flex h-8 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors"
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
