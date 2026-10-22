import { describe, expect, it } from "vitest";
import { projectDisplayName } from "./project-name";

describe("projectDisplayName", () => {
  it("takes the last segment of a POSIX path", () => {
    expect(projectDisplayName("/home/dev/code/vibepulse/apps/api")).toBe("api");
  });

  it("takes the last segment of a Windows path", () => {
    expect(projectDisplayName("D:\\code\\vibepulse\\apps\\dashboard")).toBe("dashboard");
  });

  it("ignores a trailing slash", () => {
    expect(projectDisplayName("/home/dev/code/vibepulse-api/")).toBe("vibepulse-api");
  });

  it("falls back to the raw string when there are no path separators", () => {
    expect(projectDisplayName("vibepulse-api")).toBe("vibepulse-api");
  });
});
