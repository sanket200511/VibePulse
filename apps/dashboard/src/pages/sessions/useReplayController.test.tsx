import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReplayController } from "./useReplayController";
import type { ReplayChapter, ReplayFrame } from "./replay-types";

function makeFrame(overrides: Partial<ReplayFrame> = {}): ReplayFrame {
  return {
    id: `frame-${overrides.index ?? 0}`,
    index: 0,
    timestamp: "2026-07-04T00:00:00Z",
    kind: "MARKER",
    metadata: {
      timestamp: "2026-07-04T00:00:00Z",
      event_type: null,
      file_path: null,
      language: null,
      git_branch: null,
      group_size: 0,
      group_span_seconds: null,
      member_event_ids: [],
      marker_kind: "SESSION_START",
      marker_detail: null,
    },
    insights: { analyzer_findings: {} },
    chapter_id: 1,
    is_chapter_start: true,
    ...overrides,
  };
}

const FRAMES: ReplayFrame[] = [
  makeFrame({ id: "f0", index: 0, chapter_id: 1 }),
  makeFrame({ id: "f1", index: 1, chapter_id: 1 }),
  makeFrame({ id: "f2", index: 2, chapter_id: 2 }),
];

const CHAPTERS: ReplayChapter[] = [
  {
    id: 1,
    label: "Session Started",
    kind: "SESSION_STARTED",
    start_frame_index: 0,
    end_frame_index: 1,
    start_timestamp: "2026-07-04T00:00:00Z",
    end_timestamp: "2026-07-04T00:00:01Z",
    duration_seconds: 1,
    summary_metrics: {},
  },
  {
    id: 2,
    label: "Session Completed",
    kind: "SESSION_COMPLETED",
    start_frame_index: 2,
    end_frame_index: 2,
    start_timestamp: "2026-07-04T00:00:02Z",
    end_timestamp: "2026-07-04T00:00:02Z",
    duration_seconds: 0,
    summary_metrics: {},
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useReplayController", () => {
  it("starts at frame 0, paused", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isAtStart).toBe(true);
    expect(result.current.isAtEnd).toBe(false);
  });

  it("advances one frame per tick while playing, at the base interval for speed 1", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentIndex).toBe(2);
  });

  it("stops playing automatically once it reaches the last frame", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isAtEnd).toBe(true);
  });

  it("ticks faster at higher speeds", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.setSpeed(4));
    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it("next/prev move by one frame and clamp at the bounds", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(2);
  });

  it("restart resets to frame 0 and pauses", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.currentIndex).toBe(2);

    act(() => result.current.restart());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("jumpToFrame moves directly to an index and pauses", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    act(() => result.current.jumpToFrame(2));

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isPlaying).toBe(false);
  });

  it("jumpToChapter moves to that chapter's start frame", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.jumpToChapter(2));

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentChapter?.id).toBe(2);
  });

  it("resets to frame 0 and stops when the frames array reference changes", () => {
    const { result, rerender } = renderHook(
      ({ frames }: { frames: ReplayFrame[] }) => useReplayController(frames, CHAPTERS),
      { initialProps: { frames: FRAMES } },
    );

    act(() => result.current.jumpToFrame(2));
    expect(result.current.currentIndex).toBe(2);

    const NEW_FRAMES: ReplayFrame[] = [makeFrame({ id: "g0", index: 0, chapter_id: 1 })];
    rerender({ frames: NEW_FRAMES });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });
});
