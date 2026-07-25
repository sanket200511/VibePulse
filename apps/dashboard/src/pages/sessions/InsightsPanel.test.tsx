import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InsightsPanel } from "./InsightsPanel";
import type { DeveloperInsight, SessionProfile } from "./insights-types";

function makeInsight(overrides: Partial<DeveloperInsight> = {}): DeveloperInsight {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    category: "FILES",
    generator_name: "files",
    generator_version: 1,
    headline: "/repo/a.py was the most-edited file (3 edits)",
    evidence: null,
    metrics: { top_files: [{ file_path: "/repo/a.py", event_count: 3 }] },
    ...overrides,
  };
}

function makeProfile(overrides: Partial<SessionProfile> = {}): SessionProfile {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T00:00:00Z",
    categories: {},
    ...overrides,
  };
}

describe("InsightsPanel", () => {
  it("shows an empty state when there are no populated categories", () => {
    render(<InsightsPanel profile={makeProfile()} />);

    expect(screen.getByText(/not enough activity yet/i)).toBeInTheDocument();
  });

  it("renders a category badge and its insight headlines", () => {
    render(
      <InsightsPanel
        profile={makeProfile({
          categories: { FILES: [makeInsight()] },
        })}
      />,
    );

    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("/repo/a.py was the most-edited file (3 edits)")).toBeInTheDocument();
  });

  it("renders evidence as secondary supporting text when present", () => {
    render(
      <InsightsPanel
        profile={makeProfile({
          categories: {
            FILES: [makeInsight({ evidence: "Edited at 12:00, 12:05, and 12:10." })],
          },
        })}
      />,
    );

    expect(screen.getByText("Edited at 12:00, 12:05, and 12:10.")).toBeInTheDocument();
  });

  it("renders scalar metrics as badges", () => {
    render(
      <InsightsPanel
        profile={makeProfile({
          categories: {
            SESSION_STATISTICS: [
              makeInsight({
                category: "SESSION_STATISTICS",
                headline: "2 events over 60 seconds",
                metrics: { event_count: 2, distinct_file_count: 1 },
              }),
            ],
          },
        })}
      />,
    );

    expect(screen.getByText("event_count: 2")).toBeInTheDocument();
    expect(screen.getByText("distinct_file_count: 1")).toBeInTheDocument();
  });
});
