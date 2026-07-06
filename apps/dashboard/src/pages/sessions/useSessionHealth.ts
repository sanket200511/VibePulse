/**
 * Loads the Session Health Report (GET /sessions/{id}/health) for the
 * Session Details page. Read-only, historical data — no WebSocket
 * subscription; mirrors useSessionReplay.ts's fetch pattern.
 *
 * Only fetches once `enabled` is true — the API returns 409 for sessions
 * that aren't COMPLETED yet (docs/adr/0009-health-engine.md §6), so callers
 * gate this on session status.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { HealthReport } from "./health-types";

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
  const query = useQuery({
    queryKey: ["sessions", sessionId, "health"],
    queryFn: () => fetchHealth(sessionId),
    enabled: enabled && sessionId.length > 0,
    staleTime: Infinity,
  });

  return {
    health: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
