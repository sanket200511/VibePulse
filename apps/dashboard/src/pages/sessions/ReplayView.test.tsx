import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /restart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /scrub replay/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /scrub replay/i })).toHaveAttribute(
      "aria-valuetext",
      "Frame 1 of 2",
    );
    expect(screen.getByRole("button", { name: /session started/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /session completed/i })).toBeInTheDocument();
  });

  it("disables the previous-frame button at the first frame", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /previous frame/i })).toBeDisabled();
  });

  it("advances to the next frame and updates the scrubber label", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /next frame/i }));

    expect(screen.getByRole("slider", { name: /scrub replay/i })).toHaveAttribute(
      "aria-valuetext",
      "Frame 2 of 2",
    );
    expect(screen.getByRole("button", { name: /next frame/i })).toBeDisabled();
  });

  it("jumps to a chapter when its button is clicked", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /session completed/i }));

    expect(screen.getByRole("slider", { name: /scrub replay/i })).toHaveAttribute(
      "aria-valuetext",
      "Frame 2 of 2",
    );
  });

  it("shows an empty state when there are no frames", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay({ frames: [], chapters: [] })} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/nothing to replay/i)).toBeInTheDocument();
  });

  it("marks speed buttons with aria-pressed", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "1x" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "2x" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a completion banner after autoplay finishes", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("heading", { name: "Session Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /watch again/i })).toBeInTheDocument();
  });

  it("responds to keyboard shortcuts for play/pause and navigation", () => {
    render(
      <MemoryRouter>
        <ReplayView replay={makeReplay()} />
      </MemoryRouter>,
    );

    const player = screen.getByRole("group", { name: /session replay player/i });

    fireEvent.keyDown(player, { key: "ArrowRight" });
    expect(screen.getByRole("slider", { name: /scrub replay/i })).toHaveAttribute(
      "aria-valuetext",
      "Frame 2 of 2",
    );

    fireEvent.keyDown(player, { key: "Home" });
    expect(screen.getByRole("slider", { name: /scrub replay/i })).toHaveAttribute(
      "aria-valuetext",
      "Frame 1 of 2",
    );

    fireEvent.keyDown(player, { key: " " });
    expect(screen.getByRole("button", { name: /^pause$/i })).toBeInTheDocument();
  });
});
