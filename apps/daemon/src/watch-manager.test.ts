import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createWatchManager } from "./watch-manager";
import { createObservationGate } from "./observation-gate";
import * as projectRegistrar from "./project-registrar";

describe("WatchManager", () => {
  let tempDirs: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tempDirs = [];
  });

  function createTestDir(name: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vp-test-${name}-`));
    tempDirs.push(dir);
    return dir;
  }

  function createMockDebouncer() {
    return {
      push: vi.fn(),
      flush: vi.fn(),
    };
  }

  it("successfully starts observation on valid project directory", async () => {
    const testDir = createTestDir("valid");
    const canonical = path.resolve(testDir);
    const mockProject = {
      id: "proj-123",
      display_name: path.basename(canonical),
      root_path: canonical,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(projectRegistrar, "ensureProjectWithRetry").mockResolvedValue(mockProject);

    const gate = createObservationGate();
    gate.open();
    const debouncer = createMockDebouncer();

    const manager = createWatchManager({
      apiUrl: "http://localhost:5184",
      gate,
      debouncer,
    });

    const status = await manager.start(testDir);

    expect(status.observing).toBe(true);
    expect(status.project_id).toBe("proj-123");
    expect(status.canonical_root).toBe(canonical);

    await manager.stop();
  });

  it("switches to new project, stops old watcher and registers new one", async () => {
    const dirA = createTestDir("dir-a");
    const dirB = createTestDir("dir-b");

    const mockProjectA = {
      id: "proj-a",
      display_name: path.basename(dirA),
      root_path: path.resolve(dirA),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mockProjectB = {
      id: "proj-b",
      display_name: path.basename(dirB),
      root_path: path.resolve(dirB),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const registerSpy = vi
      .spyOn(projectRegistrar, "ensureProjectWithRetry")
      .mockResolvedValueOnce(mockProjectA)
      .mockResolvedValueOnce(mockProjectB);

    const gate = createObservationGate();
    gate.open();
    const debouncer = createMockDebouncer();

    const manager = createWatchManager({
      apiUrl: "http://localhost:5184",
      gate,
      debouncer,
    });

    // Start on A
    const statusA = await manager.start(dirA);
    expect(statusA.project_id).toBe("proj-a");

    // Switch to B
    const statusB = await manager.switch(dirB);
    expect(statusB.project_id).toBe("proj-b");
    expect(registerSpy).toHaveBeenCalledTimes(2);

    await manager.stop();
  });

  it("is idempotent when switching to the already-watched canonical root", async () => {
    const dir = createTestDir("idempotent");
    const canonical = path.resolve(dir);
    const mockProject = {
      id: "proj-idempotent",
      display_name: path.basename(canonical),
      root_path: canonical,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const registerSpy = vi
      .spyOn(projectRegistrar, "ensureProjectWithRetry")
      .mockResolvedValue(mockProject);

    const gate = createObservationGate();
    gate.open();
    const debouncer = createMockDebouncer();

    const manager = createWatchManager({
      apiUrl: "http://localhost:5184",
      gate,
      debouncer,
    });

    await manager.start(dir);
    // Switch to same dir with trailing separator
    const status2 = await manager.switch(dir + (process.platform === "win32" ? "\\" : "/"));

    expect(status2.project_id).toBe("proj-idempotent");
    expect(registerSpy).toHaveBeenCalledTimes(1);

    await manager.stop();
  });

  it("rejects invalid path and leaves previous watcher untouched", async () => {
    const dir = createTestDir("reject");
    const canonical = path.resolve(dir);
    const mockProject = {
      id: "proj-valid",
      display_name: path.basename(canonical),
      root_path: canonical,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(projectRegistrar, "ensureProjectWithRetry").mockResolvedValue(mockProject);

    const gate = createObservationGate();
    gate.open();
    const debouncer = createMockDebouncer();

    const manager = createWatchManager({
      apiUrl: "http://localhost:5184",
      gate,
      debouncer,
    });

    await manager.start(dir);

    // Try switching to non-existent directory
    await expect(manager.switch("/non/existent/path/for/sure/12345")).rejects.toThrow(
      "Invalid watch path",
    );

    // Status should still reflect valid directory
    expect(manager.getStatus().project_id).toBe("proj-valid");

    await manager.stop();
  });
});
