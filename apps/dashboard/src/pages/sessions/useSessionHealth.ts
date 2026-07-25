/**
 * Loads the Session Health Report (GET /sessions/{id}/health) for the
 * Session Details page. Read-only, historical data — no WebSocket
 * subscription.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { HealthReport } from "./health-types";
import { useDemoMode } from "../../demo/config";
import { demoHealthData } from "../../demo/data";

async function fetchHealth(sessionId: string): Promise<HealthReport> {
  const response = await fetch(
    new URL(`/sessions/${sessionId}/health`, getApiBaseUrl()).toString(),
  );
  if (!response.ok) {
    throw new Error(`Failed to load health report (${response.status})`);
  }
  return (await response.json()) as HealthReport;
}

export interface UseSessionHealthResult {
  health: HealthReport | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useSessionHealth(sessionId: string, enabled: boolean): UseSessionHealthResult {
  const { isDemo } = useDemoMode();

  const query = useQuery({
    queryKey: ["sessions", sessionId, "health"],
    queryFn: () => fetchHealth(sessionId),
    enabled: !isDemo && enabled && sessionId.length > 0,
    staleTime: Infinity,
  });

  if (isDemo) {
    if (sessionId === "session_vibesync_001") {
      return {
        health: demoHealthData,
        isLoading: false,
        isError: false,
      };
    }
    return {
      health: undefined,
      isLoading: false,
      isError: false,
    };
  }

  return {
    health: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
