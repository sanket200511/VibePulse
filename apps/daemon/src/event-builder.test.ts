import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildEvent } from "./event-builder";
import { EventType, CURRENT_SCHEMA_VERSION } from "./event-types";

describe("buildEvent", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "vibepulse-test-"));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("builds a wire-shape event with schema_version and language", () => {
    const filePath = join(projectRoot, "src", "main.py");

    const event = buildEvent({
      eventType: EventType.FILE_MODIFIED,
      filePath,
      projectRoot,
      sessionId: "session-1",
    });

    expect(event.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(event.event_type).toBe(EventType.FILE_MODIFIED);
    expect(event.session_id).toBe("session-1");
    expect(event.project_root).toBe(projectRoot);
    expect(event.file_path).toBe(filePath);
    expect(event.file_name).toBe("main.py");
    expect(event.file_extension).toBe(".py");
    expect(event.language).toBe("Python");
    expect(event.metadata).toEqual({});
  });

  it("reads the current git branch when .git/HEAD exists", () => {
    mkdirSync(join(projectRoot, ".git"));
    writeFileSync(join(projectRoot, ".git", "HEAD"), "ref: refs/heads/feature/sprint-1\n");

    const event = buildEvent({
      eventType: EventType.FILE_CREATED,
      filePath: join(projectRoot, "a.ts"),
      projectRoot,
      sessionId: "session-1",
    });

    expect(event.git_branch).toBe("feature/sprint-1");
  });

  it("leaves git_branch undefined when there is no .git directory", () => {
    const event = buildEvent({
      eventType: EventType.FILE_DELETED,
      filePath: join(projectRoot, "a.ts"),
      projectRoot,
      sessionId: "session-1",
    });

    expect(event.git_branch).toBeUndefined();
  });

  it("leaves language undefined for unrecognized extensions", () => {
    const event = buildEvent({
      eventType: EventType.FILE_CREATED,
      filePath: join(projectRoot, "data.xyz"),
      projectRoot,
      sessionId: "session-1",
    });

    expect(event.language).toBeUndefined();
  });
});
