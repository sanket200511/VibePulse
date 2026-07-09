import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HealthPreviewCard } from "./HealthPreviewCard";
import type { HealthPreview } from "./types";

const preview: HealthPreview = {
  sessionId: "session-1",
  summary: "A steady, focused session with no unusual context switching.",
};

describe("HealthPreviewCard", () => {
  it("renders a loading state", () => {
    render(
      <MemoryRouter>
        <HealthPreviewCard preview={null} isLoading isError={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error state", () => {
    render(
      <MemoryRouter>
        <HealthPreviewCard preview={null} isLoading={false} isError />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders an empty state when there is no health report yet", () => {
    render(
      <MemoryRouter>
        <HealthPreviewCard preview={null} isLoading={false} isError={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No health report yet")).toBeInTheDocument();
  });

  it("renders the summary and a link to the session", () => {
    render(
      <MemoryRouter>
        <HealthPreviewCard preview={preview} isLoading={false} isError={false} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("A steady, focused session with no unusual context switching."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open session" })).toHaveAttribute(
      "href",
      "/sessions/session-1",
    );
  });
});
