/**
 * Loads the Session Profile (GET /sessions/{id}/profile) for the Session
 * Details page. Computed on demand, no persistence on the API side.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { SessionProfile } from "./insights-types";
import { useDemoMode } from "../../demo/config";
import { demoInsightsData } from "../../demo/data";

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
  const { isDemo } = useDemoMode();

  const query = useQuery({
    queryKey: ["sessions", sessionId, "profile"],
    queryFn: () => fetchProfile(sessionId),
    enabled: !isDemo && enabled && sessionId.length > 0,
  });

  if (isDemo) {
    if (sessionId === "session_vibesync_001") {
      return {
        profile: demoInsightsData,
        isLoading: false,
        isError: false,
      };
    }
    return {
      profile: undefined,
      isLoading: false,
      isError: false,
    };
  }

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
