/**
 * Pure mappers from wire shapes (Session, SessionProfile) to the shapes
 * Workspace Home's presentation components render — the only place this
 * translation happens, so WorkspaceHomePage.tsx stays a thin composition of
 * hooks + components (CLAUDE.md, "Dashboard Pages").
 */

import type { Session } from "../sessions/types";
import type { SessionProfile, InsightCategory } from "../sessions/insights-types";
import { projectDisplayName } from "../../lib/project-name";
import { deriveSessionHeadline } from "./session-headline";
import type { ContinueWorkingSession, RecentActivityItem } from "./types";

export function toContinueWorkingSession(session: Session): ContinueWorkingSession {
  return {
    id: session.id,
    projectName: projectDisplayName(session.project_root),
    headline: deriveSessionHeadline(session),
    primaryLanguage: session.primary_language ?? "Unknown",
    durationMinutes: Math.round(session.duration_seconds / 60),
    lastActivityAt: session.last_event_at,
    status: session.status,
  };
}

export function toRecentActivityItem(session: Session): RecentActivityItem {
  return {
    id: session.id,
    projectName: projectDisplayName(session.project_root),
    occurredAt: session.last_event_at,
    summary: deriveSessionHeadline(session),
    status: session.status,
  };
}

// Fixed read order — mirrors InsightsPanel's category ordering (ADR 0007)
// so the one observation Workspace Home surfaces is the same one a
// developer would see first on the full Session Detail page.
const CATEGORY_ORDER: InsightCategory[] = [
  "ACTIVITY",
  "FILES",
  "DIRECTORIES",
  "LANGUAGES",
  "DEVELOPMENT_PATTERNS",
  "SESSION_STATISTICS",
  "CONTEXT_SWITCHING",
  "IDLE_BEHAVIOUR",
];

export function deriveReflectionObservation(profile: SessionProfile | undefined): string | null {
  if (!profile) return null;
  for (const category of CATEGORY_ORDER) {
    const insight = profile.categories[category]?.[0];
    if (insight) return insight.headline;
  }
  return null;
}
