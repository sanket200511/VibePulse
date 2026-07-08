import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("announces the label to assistive tech via a polite status region", () => {
    render(<LoadingState label="Preparing your development story…" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAccessibleName("Preparing your development story…");
  });
});
