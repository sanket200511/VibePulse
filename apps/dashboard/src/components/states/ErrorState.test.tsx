import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("announces the message as an alert", () => {
    render(<ErrorState message="We couldn't reach the API. Retrying in the background…" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't reach the API. Retrying in the background…",
    );
  });
});
