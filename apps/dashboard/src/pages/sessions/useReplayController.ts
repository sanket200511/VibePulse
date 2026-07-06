/**
 * Play/Pause/Restart/Prev/Next/Speed/Jump state machine for Session Replay
 * (docs/adr/0008-replay-engine.md §9). Frame-count driven, not wall-clock —
 * each tick advances exactly one frame, at an interval scaled by `speed`.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReplayChapter, ReplayFrame } from "./replay-types";

const BASE_INTERVAL_MS = 1000;
export const REPLAY_SPEEDS = [1, 2, 4, 8] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export interface UseReplayControllerResult {
  currentIndex: number;
  currentFrame: ReplayFrame | undefined;
  currentChapter: ReplayChapter | undefined;
  isPlaying: boolean;
  speed: ReplaySpeed;
  isAtStart: boolean;
  isAtEnd: boolean;
  /** True once autoplay has run to the last frame on its own; reset on any navigation. */
  didFinish: boolean;
  play: () => void;
  pause: () => void;
  restart: () => void;
  next: () => void;
  prev: () => void;
  jumpToFrame: (index: number) => void;
  jumpToChapter: (chapterId: number) => void;
  setSpeed: (speed: ReplaySpeed) => void;
}

export function useReplayController(
  frames: ReplayFrame[],
  chapters: ReplayChapter[],
): UseReplayControllerResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [didFinish, setDidFinish] = useState(false);

  const lastIndex = frames.length - 1;

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setDidFinish(false);
  }, [frames]);

  useEffect(() => {
    if (!isPlaying || lastIndex < 0) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => {
        if (index >= lastIndex) {
          setIsPlaying(false);
          setDidFinish(true);
          return index;
        }
        return index + 1;
      });
    }, BASE_INTERVAL_MS / speed);

    return () => window.clearInterval(timer);
  }, [isPlaying, speed, lastIndex]);

  const currentFrame = frames[currentIndex];
  const currentChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === currentFrame?.chapter_id),
    [chapters, currentFrame],
  );

  return {
    currentIndex,
    currentFrame,
    currentChapter,
    isPlaying,
    speed,
    isAtStart: currentIndex <= 0,
    isAtEnd: lastIndex < 0 || currentIndex >= lastIndex,
    didFinish,
    play: () => {
      if (lastIndex < 0) return;
      setIsPlaying(true);
    },
    pause: () => setIsPlaying(false),
    restart: () => {
      setCurrentIndex(0);
      setIsPlaying(false);
      setDidFinish(false);
    },
    next: () => setCurrentIndex((index) => Math.min(index + 1, Math.max(lastIndex, 0))),
    prev: () => setCurrentIndex((index) => Math.max(index - 1, 0)),
    jumpToFrame: (index: number) => {
      setIsPlaying(false);
      setDidFinish(false);
      setCurrentIndex(Math.min(Math.max(index, 0), Math.max(lastIndex, 0)));
    },
    jumpToChapter: (chapterId: number) => {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) return;
      setIsPlaying(false);
      setDidFinish(false);
      setCurrentIndex(Math.min(chapter.start_frame_index, Math.max(lastIndex, 0)));
    },
    setSpeed,
  };
}
