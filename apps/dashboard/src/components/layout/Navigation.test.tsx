import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Navigation } from "./Navigation";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
    </MemoryRouter>,
  );
}

describe("Navigation", () => {
  it("renders the fixed anchor set: Workspace Home, Projects, History", () => {
    renderAt("/");

    expect(screen.getByRole("link", { name: "Workspace Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toBeInTheDocument();
  });

  it("marks the current anchor as the active page link", () => {
    renderAt("/projects");

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Workspace Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not mark Workspace Home active on nested routes, only on an exact match", () => {
    renderAt("/projects");

    expect(screen.getByRole("link", { name: "Workspace Home" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("is labeled as the primary navigation landmark", () => {
    renderAt("/");

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });
});
