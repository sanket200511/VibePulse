import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ContinueWorkingCard } from "./ContinueWorkingCard";
import type { ContinueWorkingSession } from "./types";

function makeSession(overrides: Partial<ContinueWorkingSession> = {}): ContinueWorkingSession {
  return {
    id: "session-1",
    projectName: "depradar-api",
    headline: "Refactored session timeline grouping",
    primaryLanguage: "Python",
    durationMinutes: 47,
    lastActivityAt: "2026-07-07T08:52:00Z",
    status: "IDLE",
    ...overrides,
  };
}

describe("ContinueWorkingCard", () => {
  it("renders the session's project, headline, and metrics", () => {
    render(
      <MemoryRouter>
        <ContinueWorkingCard session={makeSession()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("depradar-api")).toBeInTheDocument();
    expect(screen.getByText("Refactored session timeline grouping")).toBeInTheDocument();
    expect(screen.getByText("47 min")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("links Resume to the session's detail route", () => {
    render(
      <MemoryRouter>
        <ContinueWorkingCard session={makeSession({ id: "session-42" })} />
      </MemoryRouter>,
    );

    const resume = screen.getByRole("link", { name: "Resume" });
    expect(resume).toHaveAttribute("href", "/sessions/session-42");
  });

  it("renders an empty state and no Resume link when there is no session", () => {
    render(
      <MemoryRouter>
        <ContinueWorkingCard session={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Resume" })).not.toBeInTheDocument();
  });
});
