import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReplayView } from "./ReplayView";
import type { Replay, ReplayFrame } from "./replay-types";

function makeFrame(overrides: Partial<ReplayFrame> = {}): ReplayFrame {
  return {
    id: "frame-0",
    index: 0,
    timestamp: "2026-07-04T12:00:00Z",
    kind: "MARKER",
    metadata: {
      timestamp: "2026-07-04T12:00:00Z",
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

function makeReplay(overrides: Partial<Replay> = {}): Replay {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T12:00:00Z",
    frames: [
      makeFrame({ id: "f0", index: 0, chapter_id: 1 }),
      makeFrame({
        id: "f1",
        index: 1,
        chapter_id: 2,
        kind: "MARKER",
        metadata: {
          ...makeFrame().metadata,
          marker_kind: "SESSION_END",
        },
      }),
    ],
    chapters: [
      {
        id: 1,
        label: "Session Started",
        kind: "SESSION_STARTED",
        start_frame_index: 0,
        end_frame_index: 0,
        start_timestamp: "2026-07-04T12:00:00Z",
        end_timestamp: "2026-07-04T12:00:00Z",
        duration_seconds: 0,
        summary_metrics: {},
      },
      {
        id: 2,
        label: "Session Completed",
        kind: "SESSION_COMPLETED",
        start_frame_index: 1,
        end_frame_index: 1,
        start_timestamp: "2026-07-04T12:00:00Z",
        end_timestamp: "2026-07-04T12:00:00Z",
        duration_seconds: 0,
        summary_metrics: {},
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReplayView", () => {
  it("renders playback controls, the scrubber, and chapter buttons", () => {
    render(<ReplayView replay={makeReplay()} />);

    expect(screen.getByRole("button", { name: /restart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /scrub replay/i })).toBeInTheDocument();
    expect(screen.getByText("Frame 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /started: session started/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /completed: session completed/i }),
    ).toBeInTheDocument();
  });

  it("disables the previous-frame button at the first frame", () => {
    render(<ReplayView replay={makeReplay()} />);

    expect(screen.getByRole("button", { name: /previous frame/i })).toBeDisabled();
  });

  it("advances to the next frame and updates the scrubber label", () => {
    render(<ReplayView replay={makeReplay()} />);

    fireEvent.click(screen.getByRole("button", { name: /next frame/i }));

    expect(screen.getByText("Frame 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next frame/i })).toBeDisabled();
  });

  it("jumps to a chapter when its button is clicked", () => {
    render(<ReplayView replay={makeReplay()} />);

    fireEvent.click(screen.getByRole("button", { name: /completed: session completed/i }));

    expect(screen.getByText("Frame 2 of 2")).toBeInTheDocument();
  });
});
