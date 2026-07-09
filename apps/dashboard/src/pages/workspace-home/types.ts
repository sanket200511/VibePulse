/**
 * Wire-adjacent shapes each Workspace Home section renders. Kept separate
 * from the section components so the data layer (session-mappers.ts,
 * WorkspaceHomePage.tsx) and the presentation components can change
 * independently — see ../sessions/types.ts for the underlying Session shape
 * these are derived from.
 */

import type { SessionStatus } from "../sessions/types";

export interface ContinueWorkingSession {
  id: string;
  projectName: string;
  headline: string;
  primaryLanguage: string;
  durationMinutes: number;
  lastActivityAt: string;
  status: SessionStatus;
}

export interface RecentActivityItem {
  id: string;
  projectName: string;
  occurredAt: string;
  summary: string;
  status: SessionStatus;
}

export interface ReflectionPreview {
  sessionId: string;
  observation: string;
}

export interface HealthPreview {
  sessionId: string;
  summary: string;
}

export interface ConnectedProject {
  id: string;
  name: string;
  path: string;
  status: "observing" | "idle";
  lastActivityAt: string;
}
