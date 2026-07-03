/**
 * Reads the current git branch by parsing .git/HEAD directly, rather than
 * spawning a `git` subprocess on every file event. Read fresh each call
 * (no caching) so a branch switch mid-session is reflected immediately —
 * the file is a few bytes, so the cost is negligible.
 */

import { readFileSync } from "fs";
import { join } from "path";

const HEAD_REF_PATTERN = /^ref:\s*refs\/heads\/(.+)$/;

export function getGitBranch(projectRoot: string): string | undefined {
  try {
    const head = readFileSync(join(projectRoot, ".git", "HEAD"), "utf-8").trim();
    const match = HEAD_REF_PATTERN.exec(head);
    return match?.[1];
  } catch {
    return undefined;
  }
}
