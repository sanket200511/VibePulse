import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNormaliser } from "./normaliser";
import { EventType, CURRENT_SCHEMA_VERSION } from "./event-types";

describe("createNormaliser", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "vibepulse-normaliser-test-"));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  describe("valid events", () => {
    it("produces a correctly shaped event for a TypeScript file", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const filePath = join(projectRoot, "src", "main.ts");

      const event = normaliser.normalise(EventType.FILE_MODIFIED, filePath);

      expect(event).not.toBeNull();
      expect(event!.schema_version).toBe(CURRENT_SCHEMA_VERSION);
      expect(event!.event_type).toBe(EventType.FILE_MODIFIED);
      expect(event!.session_id).toBe("sess-1");
      expect(event!.project_root).toBe(projectRoot);
      expect(event!.file_path).toBe(filePath);
      expect(event!.file_name).toBe("main.ts");
      expect(event!.file_extension).toBe(".ts");
      expect(event!.language).toBe("TypeScript");
      expect(event!.metadata).toEqual({});
    });

    it("detects language from file extension", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const event = normaliser.normalise(EventType.FILE_CREATED, join(projectRoot, "app.py"));
      expect(event!.language).toBe("Python");
    });

    it("leaves language undefined for unrecognised extensions", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const event = normaliser.normalise(EventType.FILE_CREATED, join(projectRoot, "data.xyz"));
      expect(event!.language).toBeUndefined();
    });

    it("leaves file_extension undefined for files without an extension", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const event = normaliser.normalise(EventType.FILE_MODIFIED, join(projectRoot, "Makefile"));
      expect(event!.file_extension).toBeUndefined();
    });

    it("reads git_branch when .git/HEAD exists", () => {
      mkdirSync(join(projectRoot, ".git"));
      writeFileSync(join(projectRoot, ".git", "HEAD"), "ref: refs/heads/feature/px-5\n");
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const event = normaliser.normalise(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      expect(event!.git_branch).toBe("feature/px-5");
    });

    it("leaves git_branch undefined when there is no .git directory", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const event = normaliser.normalise(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      expect(event!.git_branch).toBeUndefined();
    });

    it("sets a valid ISO 8601 timestamp", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const before = new Date().toISOString();
      const event = normaliser.normalise(EventType.FILE_CREATED, join(projectRoot, "f.ts"));
      const after = new Date().toISOString();
      expect(event!.timestamp >= before).toBe(true);
      expect(event!.timestamp <= after).toBe(true);
    });
  });

  describe("daemon_seq", () => {
    it("starts at 0 for the first event", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const event = normaliser.normalise(EventType.FILE_CREATED, join(projectRoot, "a.ts"));
      expect(event!.daemon_seq).toBe(0);
    });

    it("increments strictly by 1 per normalised event", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const e0 = normaliser.normalise(EventType.FILE_CREATED, join(projectRoot, "a.ts"));
      const e1 = normaliser.normalise(EventType.FILE_MODIFIED, join(projectRoot, "b.ts"));
      const e2 = normaliser.normalise(EventType.FILE_DELETED, join(projectRoot, "c.ts"));
      expect(e0!.daemon_seq).toBe(0);
      expect(e1!.daemon_seq).toBe(1);
      expect(e2!.daemon_seq).toBe(2);
    });

    it("is independent between two normaliser instances", () => {
      const n1 = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const n2 = createNormaliser({ projectRoot, sessionId: "sess-2" });
      n1.normalise(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      n1.normalise(EventType.FILE_MODIFIED, join(projectRoot, "b.ts"));
      const e = n2.normalise(EventType.FILE_MODIFIED, join(projectRoot, "c.ts"));
      // n2 has its own counter starting at 0
      expect(e!.daemon_seq).toBe(0);
    });

    it("does not increment for invalid events that return null", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      // invalid: path not under project_root
      normaliser.normalise(EventType.FILE_MODIFIED, "/completely/outside/path/file.ts");
      const validEvent = normaliser.normalise(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      // seq should still be 0 — the invalid event consumed no sequence number
      expect(validEvent!.daemon_seq).toBe(0);
    });
  });

  describe("path validation", () => {
    it("returns null for a path exceeding 2048 characters", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const longPath = join(projectRoot, "a".repeat(2050));
      expect(normaliser.normalise(EventType.FILE_MODIFIED, longPath)).toBeNull();
    });

    it("returns null for a path outside the project root", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      expect(
        normaliser.normalise(EventType.FILE_MODIFIED, "/tmp/other-project/main.ts"),
      ).toBeNull();
    });

    it("returns null for the project root itself (must be a strict descendant)", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      expect(normaliser.normalise(EventType.FILE_MODIFIED, projectRoot)).toBeNull();
    });

    it("returns null for a sibling directory that shares a prefix with project root", () => {
      // /tmp/vibepulse-test-XYZ should NOT match /tmp/vibepulse-test-XYZother
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const siblingFile = projectRoot + "other" + "/file.ts";
      expect(normaliser.normalise(EventType.FILE_MODIFIED, siblingFile)).toBeNull();
    });

    it("accepts a deeply nested file under the project root", () => {
      const normaliser = createNormaliser({ projectRoot, sessionId: "sess-1" });
      const nested = join(projectRoot, "a", "b", "c", "d.ts");
      expect(normaliser.normalise(EventType.FILE_MODIFIED, nested)).not.toBeNull();
    });
  });
});
