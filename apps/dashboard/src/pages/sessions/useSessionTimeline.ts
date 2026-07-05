/**
 * Loads the Session Timeline (GET /sessions/{id}/timeline) for the Session
 * Details page. Read-only, historical data — no WebSocket subscription;
 * mirrors useSessionsData.ts's fetch pattern minus the live-update layer.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Timeline } from "./timeline-types";

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
  const query = useQuery({
    queryKey: ["sessions", sessionId, "timeline"],
    queryFn: () => fetchTimeline(sessionId),
  });

  return {
    timeline: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
