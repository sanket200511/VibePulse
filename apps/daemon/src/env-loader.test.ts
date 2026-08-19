import { describe, expect, it, afterEach } from "vitest";
import { getCliWatchTarget, loadDaemonEnv } from "./env-loader";

describe("env-loader", () => {
  const originalArgv = process.argv;
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.argv = originalArgv;
    process.env = { ...originalEnv };
  });

  it("extracts --watch flag from CLI arguments", () => {
    process.argv = ["node", "src/index.ts", "--watch", "D:\\Projects\\Animal Disease Prediction"];
    expect(getCliWatchTarget()).toBe("D:\\Projects\\Animal Disease Prediction");
  });

  it("extracts -w flag from CLI arguments", () => {
    process.argv = ["node", "src/index.ts", "-w", "/custom/watch/path"];
    expect(getCliWatchTarget()).toBe("/custom/watch/path");
  });

  it("extracts --watch=path format from CLI arguments", () => {
    process.argv = ["node", "src/index.ts", "--watch=/custom/watch/path"];
    expect(getCliWatchTarget()).toBe("/custom/watch/path");
  });

  it("returns undefined when no watch flag is provided", () => {
    process.argv = ["node", "src/index.ts"];
    expect(getCliWatchTarget()).toBeUndefined();
  });

  it("sets WATCH_ROOT from CLI argument during loadDaemonEnv", () => {
    process.argv = ["node", "src/index.ts", "--watch", "D:\\Projects\\CustomProject"];
    delete process.env.WATCH_ROOT;
    loadDaemonEnv();
    expect(process.env.WATCH_ROOT).toBe("D:\\Projects\\CustomProject");
  });
});
