import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-07-07T12:00:00Z");

describe("formatRelativeTime", () => {
  it("reports very recent timestamps as just now", () => {
    expect(formatRelativeTime("2026-07-07T11:59:45Z", NOW)).toBe("Just now");
  });

  it("reports minutes ago within the hour", () => {
    expect(formatRelativeTime("2026-07-07T11:45:00Z", NOW)).toBe("15 minutes ago");
  });

  it("reports hours ago within the day", () => {
    expect(formatRelativeTime("2026-07-07T08:00:00Z", NOW)).toBe("4 hours ago");
  });

  it("reports yesterday for a one-day-old timestamp", () => {
    expect(formatRelativeTime("2026-07-06T10:00:00Z", NOW)).toBe("Yesterday");
  });

  it("reports days ago within the week", () => {
    expect(formatRelativeTime("2026-07-03T12:00:00Z", NOW)).toBe("4 days ago");
  });

  it("falls back to a generic phrase beyond a week", () => {
    expect(formatRelativeTime("2026-06-01T12:00:00Z", NOW)).toBe("Over a week ago");
  });
});
