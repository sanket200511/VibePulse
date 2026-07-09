/**
 * Loads the Session Profile (GET /sessions/{id}/profile) for the Session
 * Details page. Computed on demand, no persistence on the API side — mirrors
 * useSessionTimeline.ts's fetch pattern.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { SessionProfile } from "./insights-types";

async function fetchProfile(sessionId: string): Promise<SessionProfile> {
  const response = await fetch(
    new URL(`/sessions/${sessionId}/profile`, getApiBaseUrl()).toString(),
  );
  if (!response.ok) {
    throw new Error(`Failed to load session profile (${response.status})`);
  }
  return (await response.json()) as SessionProfile;
}

export interface UseSessionInsightsResult {
  profile: SessionProfile | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useSessionInsights(sessionId: string, enabled = true): UseSessionInsightsResult {
  const query = useQuery({
    queryKey: ["sessions", sessionId, "profile"],
    queryFn: () => fetchProfile(sessionId),
    enabled: enabled && sessionId.length > 0,
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
