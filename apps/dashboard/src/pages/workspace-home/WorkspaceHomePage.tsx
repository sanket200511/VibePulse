/**
 * Workspace Home — the product's single entry point (docs/design/PRODUCT_EXPERIENCE.md,
 * Section 3.1). Fills in the full Information Hierarchy from Section 5:
 * Welcome, Continue Working, Recent Activity, Reflection, Health, Connected
 * Projects, in that exact order — the eye moves top to bottom once and
 * regains context in seconds.
 *
 * Continue Working, Recent Activity, and the Welcome greeting all read from
 * the one useSessionsData() query/WebSocket subscription — a single network
 * source, no duplicate polling. Reflection and Health each load independently
 * for the latest session, gated so Health never requests a report for a
 * session that isn't COMPLETED yet (see useSessionHealth.ts / ADR 0009).
 *
 * Connected Projects has no backend data source yet — there is no
 * apps/api/app/features/projects/ module — so it stays on its designed
 * empty state until that endpoint exists, rather than inventing one from
 * session.project_root client-side.
 */

import { useMemo } from "react";
import { WelcomeSection } from "./WelcomeSection";
import { ContinueWorkingCard } from "./ContinueWorkingCard";
import { RecentActivityList } from "./RecentActivityList";
import { ReflectionPreviewCard } from "./ReflectionPreviewCard";
import { HealthPreviewCard } from "./HealthPreviewCard";
import { ConnectedProjectsList } from "./ConnectedProjectsList";
import { LoadingState, ErrorState } from "../../components/states";
import { useSessionsData } from "../sessions/useSessionsData";
import { useSessionInsights } from "../sessions/useSessionInsights";
import { useSessionHealth } from "../sessions/useSessionHealth";
import {
  toContinueWorkingSession,
  toRecentActivityItem,
  deriveReflectionObservation,
} from "./session-mappers";

export function WorkspaceHomePage() {
  const { sessions, isLoading: sessionsLoading, isError: sessionsError } = useSessionsData();
  const latestSession = sessions[0];

  const {
    profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useSessionInsights(latestSession?.id ?? "", !!latestSession);

  const {
    health,
    isLoading: healthLoading,
    isError: healthError,
  } = useSessionHealth(latestSession?.id ?? "", latestSession?.status === "COMPLETED");

  const continueWorking = useMemo(
    () => (latestSession ? toContinueWorkingSession(latestSession) : null),
    [latestSession],
  );
  const recentActivity = useMemo(() => sessions.map(toRecentActivityItem), [sessions]);
  const reflectionObservation = deriveReflectionObservation(profile);

  return (
    <div className="flex flex-1 justify-center px-6 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="animate-fade-in-up flex w-full max-w-5xl flex-col gap-8">
        <WelcomeSection
          hasActiveSession={latestSession?.status === "ACTIVE"}
          {...(continueWorking ? { projectName: continueWorking.projectName } : {})}
        />

        <div className="flex flex-col gap-6">
          {sessionsLoading ? (
            <LoadingState label="Loading your recent sessions…" />
          ) : sessionsError ? (
            <ErrorState message="We couldn't load your sessions. Try again shortly." />
          ) : (
            <>
              <ContinueWorkingCard session={continueWorking} />
              <RecentActivityList items={recentActivity} />
            </>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ReflectionPreviewCard
              preview={
                latestSession && reflectionObservation
                  ? { sessionId: latestSession.id, observation: reflectionObservation }
                  : null
              }
              isLoading={profileLoading}
              isError={profileError}
            />
            <HealthPreviewCard
              preview={
                latestSession && health
                  ? { sessionId: latestSession.id, summary: health.summary.narrative }
                  : null
              }
              isLoading={healthLoading}
              isError={healthError}
            />
          </div>

          <ConnectedProjectsList projects={[]} />
        </div>
      </div>
    </div>
  );
}
