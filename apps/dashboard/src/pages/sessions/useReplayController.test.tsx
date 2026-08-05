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

  it("advances one frame per tick while playing, with proportional pacing", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    // Frame 0 -> 1: interval is 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.currentIndex).toBe(1);

    // Frame 1 -> 2: interval is 500ms + 1000ms chapter transition = 1500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.currentIndex).toBe(2);
  });

  it("stops playing automatically once it reaches the last frame", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(500); // 0 -> 1
    });
    act(() => {
      vi.advanceTimersByTime(1500); // 1 -> 2
    });

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isAtEnd).toBe(true);
  });

  it("ticks faster at higher speeds", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.setSpeed(4));
    act(() => result.current.play());

    // Frame 0 -> 1 would be 500ms. At 4x speed, it's 125ms.
    act(() => {
      vi.advanceTimersByTime(125);
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
      vi.advanceTimersByTime(500);
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.currentIndex).toBe(2);

    act(() => result.current.restart());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isAtEnd).toBe(false);
  });

  it("jumpToFrame moves directly to an index and pauses", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    act(() => result.current.jumpToFrame(1));

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("jumpToChapter moves to that chapter's start frame", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.jumpToChapter(2));

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentChapter?.id).toBe(2);
  });

  it("maintains current frame and playback state when frames array grows (live append)", () => {
    const { result, rerender } = renderHook(
      (props) => useReplayController(props.frames, props.chapters),
      { initialProps: { frames: FRAMES, chapters: CHAPTERS } },
    );

    act(() => result.current.jumpToFrame(1));
    act(() => result.current.play());

    const newFrames = [...FRAMES, makeFrame({ id: "f3", index: 3, chapter_id: 2 })];
    rerender({ frames: newFrames, chapters: CHAPTERS });

    // It should not reset!
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it("sets didFinish only when autoplay reaches the end on its own", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    expect(result.current.didFinish).toBe(false);

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.didFinish).toBe(true);
  });

  it("does not set didFinish when manually stepping to the last frame", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.jumpToFrame(2));

    expect(result.current.didFinish).toBe(false);
  });

  it("clears didFinish when playing again, restarting, or jumping", () => {
    const { result } = renderHook(() => useReplayController(FRAMES, CHAPTERS));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.didFinish).toBe(true);

    act(() => result.current.restart());
    expect(result.current.didFinish).toBe(false);

    act(() => result.current.jumpToFrame(2));
    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.didFinish).toBe(true);

    act(() => result.current.jumpToFrame(0));
    expect(result.current.didFinish).toBe(false);
  });
});
