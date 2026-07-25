/**
 * Loads the Session Timeline (GET /sessions/{id}/timeline) for the Session
 * Details page. Read-only, historical data — no WebSocket subscription.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Timeline } from "./timeline-types";
import { useDemoMode } from "../../demo/config";
import { demoTimelineData } from "../../demo/data";

async function fetchTimeline(sessionId: string): Promise<Timeline> {
  const response = await fetch(
    new URL(`/sessions/${sessionId}/timeline`, getApiBaseUrl()).toString(),
  );
  if (!response.ok) {
    throw new Error(`Failed to load timeline (${response.status})`);
  }
  return (await response.json()) as Timeline;
}

export interface UseSessionTimelineResult {
  timeline: Timeline | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useSessionTimeline(sessionId: string): UseSessionTimelineResult {
  const { isDemo } = useDemoMode();

  const query = useQuery({
    queryKey: ["sessions", sessionId, "timeline"],
    queryFn: () => fetchTimeline(sessionId),
    enabled: !isDemo && sessionId.length > 0,
  });

  if (isDemo) {
    if (sessionId === "session_vibesync_001") {
      return {
        timeline: demoTimelineData,
        isLoading: false,
        isError: false,
      };
    }
    return {
      timeline: undefined,
      isLoading: false,
      isError: false,
    };
  }

  return {
    timeline: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
