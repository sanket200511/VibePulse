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
  it("renders the session summary headline", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("3 events over 2 min")).toBeInTheDocument();
  });

  it("falls back to a generic heading when there is no session summary", () => {
    render(<SessionOutcomeCard outcome={makeOutcome({ session_summary: null })} />);

    expect(screen.getByText("Session outcome")).toBeInTheDocument();
  });

  it("renders duration, event, and file counts", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("2 min")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the largest change file and count when derivable", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("/repo/a.py (3×)")).toBeInTheDocument();
  });

  it("shows a dash for largest change when it cannot be derived", () => {
    render(<SessionOutcomeCard outcome={makeOutcome({ largest_change: null })} />);

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders a badge per language with its event count", () => {
    render(<SessionOutcomeCard outcome={makeOutcome()} />);

    expect(screen.getByText("python (3)")).toBeInTheDocument();
    expect(screen.getByText("typescript (1)")).toBeInTheDocument();
  });
});
