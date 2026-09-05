import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ConnectedProjectsList } from "./ConnectedProjectsList";
import type { ConnectedProject } from "./types";

describe("ConnectedProjectsList", () => {
  it("renders each connected project's name and status", () => {
    const projects: ConnectedProject[] = [
      {
        id: "proj-1",
        name: "depradar-api",
        path: "~/code/vibepulse/apps/api",
        status: "observing",
        lastActivityAt: "2026-07-07T08:52:00Z",
      },
      {
        id: "proj-2",
        name: "acme-checkout-service",
        path: "~/code/acme/checkout-service",
        status: "idle",
        lastActivityAt: "2026-07-06T14:03:00Z",
      },
    ];

    render(
      <MemoryRouter>
        <ConnectedProjectsList projects={projects} />
      </MemoryRouter>,
    );

    expect(screen.getByText("depradar-api")).toBeInTheDocument();
    expect(screen.getByText("Observing")).toBeInTheDocument();
    expect(screen.getByText("acme-checkout-service")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });

  it("shows an explanatory empty state when there are no connected projects", () => {
    render(
      <MemoryRouter>
        <ConnectedProjectsList projects={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No projects connected yet")).toBeInTheDocument();
  });
});
