import { describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { validateAndResolveWatchRoot } from "./path-validator";

describe("validateAndResolveWatchRoot", () => {
  it("rejects missing or undefined WATCH_ROOT", () => {
    const res = validateAndResolveWatchRoot(undefined);
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain("missing or empty");
  });

  it("rejects empty string WATCH_ROOT", () => {
    const res = validateAndResolveWatchRoot("   ");
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain("missing or empty");
  });

  it("rejects drive root path like C:\\ or /", () => {
    const root = process.platform === "win32" ? "C:\\" : "/";
    const res = validateAndResolveWatchRoot(root);
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain("entire drive root is not permitted");
  });

  it("rejects home directory root", () => {
    const home = os.homedir();
    const res = validateAndResolveWatchRoot(home);
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain("entire user home directory is not permitted");
  });

  it("rejects non-existent directory", () => {
    const fakePath = path.join(os.tmpdir(), "vibepulse_non_existent_folder_" + Date.now());
    const res = validateAndResolveWatchRoot(fakePath);
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toContain("directory does not exist");
  });

  it("accepts valid existing directory (including paths with spaces and Windows format)", () => {
    const validDir = os.tmpdir();
    const res = validateAndResolveWatchRoot(validDir);
    expect(res.valid).toBe(true);
    expect(res.exists).toBe(true);
    expect(res.isDirectory).toBe(true);
    expect(res.resolvedPath).toBe(path.resolve(validDir));
  });
});
