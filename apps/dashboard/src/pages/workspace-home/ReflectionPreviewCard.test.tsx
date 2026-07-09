import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ReflectionPreviewCard } from "./ReflectionPreviewCard";
import type { ReflectionPreview } from "./types";

const preview: ReflectionPreview = {
  sessionId: "session-1",
  observation: "Most of today's work stayed inside a single module.",
};

describe("ReflectionPreviewCard", () => {
  it("renders a loading state", () => {
    render(
      <MemoryRouter>
        <ReflectionPreviewCard preview={null} isLoading isError={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error state", () => {
    render(
      <MemoryRouter>
        <ReflectionPreviewCard preview={null} isLoading={false} isError />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders an empty state when there is no reflection yet", () => {
    render(
      <MemoryRouter>
        <ReflectionPreviewCard preview={null} isLoading={false} isError={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No reflection yet")).toBeInTheDocument();
  });

  it("renders the observation and a link to the session", () => {
    render(
      <MemoryRouter>
        <ReflectionPreviewCard preview={preview} isLoading={false} isError={false} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Most of today's work stayed inside a single module."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open session" })).toHaveAttribute(
      "href",
      "/sessions/session-1",
    );
  });
});
