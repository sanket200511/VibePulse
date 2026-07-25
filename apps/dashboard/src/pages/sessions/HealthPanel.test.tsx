import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthPanel } from "./HealthPanel";
import type { HealthMetric, HealthReport } from "./health-types";

function makeMetric(overrides: Partial<HealthMetric> = {}): HealthMetric {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    category: "FOCUS",
    generator_name: "focus",
    generator_version: 1,
    label: "Activity Density",
    headline: "80% of this session was spent in active work.",
    evidence: null,
    metrics: { focus_ratio: 0.8 },
    ...overrides,
  };
}

function makeHealthReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T00:00:00Z",
    metrics: {},
    summary: { narrative: "This session was highly focused.", guidance: [] },
    ...overrides,
  };
}

describe("HealthPanel", () => {
  it("shows an empty state when there are no metrics", () => {
    render(<HealthPanel health={makeHealthReport()} />);

    expect(screen.getByText(/not enough activity in this session/i)).toBeInTheDocument();
  });

  it("renders the narrative and a card per populated category", () => {
    render(
      <HealthPanel
        health={makeHealthReport({
          metrics: { FOCUS: makeMetric() },
        })}
      />,
    );

    expect(screen.getByText("This session was highly focused.")).toBeInTheDocument();
    expect(screen.getByText("Activity Density")).toBeInTheDocument();
    expect(screen.getByText("80% of this session was spent in active work.")).toBeInTheDocument();
  });

  it("renders evidence as secondary supporting text when present", () => {
    render(
      <HealthPanel
        health={makeHealthReport({
          metrics: { FOCUS: makeMetric({ evidence: "Longest streak was 45 minutes." }) },
        })}
      />,
    );

    expect(screen.getByText("Longest streak was 45 minutes.")).toBeInTheDocument();
  });

  it("renders scalar metrics as badges", () => {
    render(
      <HealthPanel
        health={makeHealthReport({
          metrics: {
            FOCUS: makeMetric({ metrics: { focus_ratio: 0.8, longest_streak_seconds: 120 } }),
          },
        })}
      />,
    );

    expect(screen.getByText("focus_ratio: 0.80")).toBeInTheDocument();
    expect(screen.getByText("longest_streak_seconds: 120")).toBeInTheDocument();
  });

  it("renders the guidance list when non-empty, headed 'Observed Guidance'", () => {
    render(
      <HealthPanel
        health={makeHealthReport({
          metrics: { FOCUS: makeMetric() },
          summary: {
            narrative: "This session was highly focused.",
            guidance: ["This session moved across many areas of work."],
          },
        })}
      />,
    );

    expect(screen.getByText("Observed Guidance")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "This session moved across many areas of work.",
    );
  });

  it("omits the guidance section when empty", () => {
    render(<HealthPanel health={makeHealthReport({ metrics: { FOCUS: makeMetric() } })} />);

    expect(screen.queryByText("Observed Guidance")).not.toBeInTheDocument();
  });
});
