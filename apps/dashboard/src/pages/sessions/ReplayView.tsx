import { Badge, Button } from "@vibepulse/ui";
import { TimelineEntryRow } from "./TimelineEntryRow";
import { REPLAY_SPEEDS, useReplayController, type ReplaySpeed } from "./useReplayController";
import type { Replay } from "./replay-types";

const CHAPTER_KIND_LABEL: Record<string, string> = {
  SESSION_STARTED: "Started",
  WORK: "Work",
  IDLE: "Idle",
  RESUMED: "Resumed",
  SESSION_COMPLETED: "Completed",
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

export interface ReplayViewProps {
  replay: Replay;
}

export function ReplayView({ replay }: ReplayViewProps) {
  const controller = useReplayController(replay.frames, replay.chapters);
  const { currentFrame, currentChapter, currentIndex } = controller;

  return (
    <div className="flex flex-col gap-4">
      {currentChapter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {CHAPTER_KIND_LABEL[currentChapter.kind] ?? currentChapter.kind}
          </Badge>
          <h3 className="text-foreground truncate text-sm font-semibold">{currentChapter.label}</h3>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={controller.restart} aria-label="Restart">
          ⏮
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={controller.prev}
          disabled={controller.isAtStart}
          aria-label="Previous frame"
        >
          ◀
        </Button>
        {controller.isPlaying ? (
          <Button variant="primary" size="sm" onClick={controller.pause} aria-label="Pause">
            ⏸ Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={controller.play}
            disabled={controller.isAtEnd}
            aria-label="Play"
          >
            ▶ Play
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={controller.next}
          disabled={controller.isAtEnd}
          aria-label="Next frame"
        >
          ▶
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-muted-foreground text-xs">Speed</span>
          {REPLAY_SPEEDS.map((speed) => (
            <Button
              key={speed}
              variant={controller.speed === speed ? "secondary" : "ghost"}
              size="sm"
              onClick={() => controller.setSpeed(speed as ReplaySpeed)}
            >
              {speed}×
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={Math.max(replay.frames.length - 1, 0)}
          value={currentIndex}
          onChange={(event) => controller.jumpToFrame(Number(event.target.value))}
          className="accent-primary w-full"
          aria-label="Scrub replay"
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>
            Frame {currentIndex + 1} of {replay.frames.length}
          </span>
          {currentFrame && <span>{formatTime(currentFrame.timestamp)}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {replay.chapters.map((chapter) => {
          const isCurrent = currentChapter?.id === chapter.id;
          return (
            <Button
              key={chapter.id}
              variant={isCurrent ? "secondary" : "outline"}
              size="sm"
              onClick={() => controller.jumpToChapter(chapter.id)}
            >
              {CHAPTER_KIND_LABEL[chapter.kind] ?? chapter.kind}: {chapter.label}
            </Button>
          );
        })}
      </div>

      {currentFrame && (
        <div className="border-border bg-card rounded-[16px] border p-2">
          <ol className="flex flex-col">
            <TimelineEntryRow
              entry={{
                id: currentFrame.id,
                entry_kind: currentFrame.kind,
                metadata: currentFrame.metadata,
                insights: currentFrame.insights,
              }}
            />
          </ol>
        </div>
      )}
    </div>
  );
}
