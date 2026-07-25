import { describe, it, expect } from "vitest";
import { formatReplayTime } from "./replay-time-utils";

describe("replay-time-utils", () => {
  it("formats valid ISO strings correctly", () => {
    // We mock the local timezone to avoid flakiness, or just test it doesn't throw and returns a string
    const result = formatReplayTime("2026-07-14T10:00:00Z");
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("handles malformed fallback timestamps gracefully without 'Invalid Date'", () => {
    const result = formatReplayTime("10:00");
    // "10:00" is an invalid date string for new Date() in many browsers/engines
    // It should just return "10:00" as a fallback, not "Invalid Date"
    expect(result).not.toContain("Invalid");
    expect(result).toBe("10:00");
  });

  it("handles empty or null values", () => {
    expect(formatReplayTime(null)).toBe("00:00");
    expect(formatReplayTime(undefined)).toBe("00:00");
    expect(formatReplayTime("")).toBe("00:00");
  });
});
