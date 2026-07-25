import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SessionOutcomeCard } from "./SessionOutcomeCard";
import type { SessionOutcome } from "./timeline-types";

function makeOutcome(overrides: Partial<SessionOutcome> = {}): SessionOutcome {
  return {
    duration_seconds: 120,
    event_count: 4,
    distinct_file_count: 2,
    primary_language: "python",
    languages: { python: 3, typescript: 1 },
    largest_change: { file_path: "/repo/a.py", event_count: 3 },
    session_summary: { headline: "3 events over 2 min" },
    ...overrides,
  };
}

describe("SessionOutcomeCard", () => {
  it("renders the session footprint text", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("Session Footprint")).toBeInTheDocument();
  });

  it("renders duration, event, and file counts in the new fingerprint layout", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("2m")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the largest change file and count", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("/repo/a.py")).toBeInTheDocument();
    expect(screen.getByText("(3×)")).toBeInTheDocument();
  });

  it("does not render largest change if it cannot be derived", () => {
    render(<SessionOutcomeCard outcome={makeOutcome({ largest_change: null })} />);

    expect(screen.queryByText("Largest Change")).not.toBeInTheDocument();
  });

  it("renders languages", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });
});
