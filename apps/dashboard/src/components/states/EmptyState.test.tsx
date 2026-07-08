import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <EmptyState title="No sessions yet" description="Start coding to see one appear here." />,
    );

    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
    expect(screen.getByText("Start coding to see one appear here.")).toBeInTheDocument();
  });

  it("renders an optional action", () => {
    render(
      <EmptyState
        title="No projects connected"
        description="Connect a project to start observing it."
        action={<button>Connect project</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Connect project" })).toBeInTheDocument();
  });
});
