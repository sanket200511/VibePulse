import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout";

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>Page content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  it("renders a skip link targeting the main content region", () => {
    renderShell();

    const skipLink = screen.getByRole("link", { name: "Skip to content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("renders the primary navigation and the routed page content inside a labeled main region", () => {
    renderShell();

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
