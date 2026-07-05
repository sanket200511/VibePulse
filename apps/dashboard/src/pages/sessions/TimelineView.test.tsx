import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelineView } from "./TimelineView";
import type { TimelineEntry } from "./timeline-types";

function makeEventEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: "entry-1",
    entry_kind: "EVENT",
    metadata: {
      timestamp: "2026-07-04T12:00:00Z",
      event_type: "FILE_MODIFIED",
      file_path: "/repo/src/app.py",
      language: "python",
      git_branch: "main",
      group_size: 1,
      group_span_seconds: null,
      member_event_ids: ["11111111-1111-1111-1111-111111111111"],
      marker_kind: null,
      marker_detail: null,
    },
    insights: { analyzer_findings: {} },
    ...overrides,
  };
}

function makeMarkerEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: "marker-1",
    entry_kind: "MARKER",
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
    ...overrides,
  };
}

describe("TimelineView", () => {
  it("shows an empty state when there are no entries", () => {
    render(<TimelineView entries={[]} />);

    expect(screen.getByText(/no events were recorded/i)).toBeInTheDocument();
  });

  it("renders a marker entry with its label", () => {
    render(<TimelineView entries={[makeMarkerEntry()]} />);

    expect(screen.getByText(/session started/i)).toBeInTheDocument();
  });

  it("renders an idle marker with its detail text", () => {
    render(
      <TimelineView
        entries={[
          makeMarkerEntry({
            id: "marker-idle",
            metadata: {
              ...makeMarkerEntry().metadata,
              marker_kind: "IDLE_GAP",
              marker_detail: "180s idle",
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/idle/i)).toBeInTheDocument();
    expect(screen.getByText(/180s idle/)).toBeInTheDocument();
  });

  it("renders a grouped entry with its group size badge", () => {
    render(
      <TimelineView
        entries={[
          makeEventEntry({
            id: "group-1",
            entry_kind: "GROUP",
            metadata: {
              ...makeEventEntry().metadata,
              group_size: 3,
              group_span_seconds: 12,
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByText("app.py")).toBeInTheDocument();
  });

  it("renders the language badge and analyzer finding count for an event", () => {
    render(
      <TimelineView
        entries={[
          makeEventEntry({
            insights: { analyzer_findings: { file_metadata: { is_test: true } } },
          }),
        ]}
      />,
    );

    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("1 finding")).toBeInTheDocument();
  });

  it("preserves entry order — create, then modify, then delete render as distinct rows", () => {
    render(
      <TimelineView
        entries={[
          makeEventEntry({
            id: "created",
            metadata: {
              ...makeEventEntry().metadata,
              event_type: "FILE_CREATED",
              file_path: "/repo/a.py",
            },
          }),
          makeEventEntry({
            id: "modified",
            metadata: {
              ...makeEventEntry().metadata,
              event_type: "FILE_MODIFIED",
              file_path: "/repo/a.py",
            },
          }),
          makeEventEntry({
            id: "deleted",
            metadata: { ...makeEventEntry().metadata, event_type: "FILE_DELETED" },
          }),
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });
});
