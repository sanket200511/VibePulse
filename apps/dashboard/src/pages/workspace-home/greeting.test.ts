import { describe, expect, it } from "vitest";
import { getGreeting } from "./greeting";

describe("getGreeting", () => {
  it("greets with good morning before noon", () => {
    expect(getGreeting(new Date("2026-07-07T08:00:00"), false).salutation).toBe("Good morning.");
  });

  it("greets with good afternoon before 6pm", () => {
    expect(getGreeting(new Date("2026-07-07T14:00:00"), false).salutation).toBe("Good afternoon.");
  });

  it("greets with good evening after 6pm", () => {
    expect(getGreeting(new Date("2026-07-07T20:00:00"), false).salutation).toBe("Good evening.");
  });

  it("mentions an in-progress session when one is active", () => {
    expect(getGreeting(new Date("2026-07-07T08:00:00"), true).message).toBe(
      "You have a session in progress.",
    );
  });

  it("otherwise points back to where the developer left off", () => {
    expect(getGreeting(new Date("2026-07-07T08:00:00"), false).message).toBe(
      "Here's where you left off.",
    );
  });

  it("names the project when one is known and no session is active", () => {
    expect(getGreeting(new Date("2026-07-07T08:00:00"), false, "vibepulse-api").message).toBe(
      "Here's where you left off in vibepulse-api.",
    );
  });

  it("names the project when one is known and a session is active", () => {
    expect(getGreeting(new Date("2026-07-07T08:00:00"), true, "vibepulse-api").message).toBe(
      "You have a session in progress on vibepulse-api.",
    );
  });
});
