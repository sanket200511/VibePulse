/**
 * Loads the Session Replay (GET /sessions/{id}/replay) for the Session
 * Details page. Read-only, historical data — no WebSocket subscription;
 * mirrors useSessionTimeline.ts's fetch pattern.
 *
 * Only fetches once `enabled` is true — the API returns 409 for sessions
 * that aren't COMPLETED yet (docs/adr/0008-replay-engine.md §5), so callers
 * gate this on session status.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Replay } from "./replay-types";

async function fetchReplay(sessionId: string): Promise<Replay> {
  const response = await fetch(
    new URL(`/sessions/${sessionId}/replay`, getApiBaseUrl()).toString(),
  );
  if (!response.ok) {
    throw new Error(`Failed to load replay (${response.status})`);
  }
  return (await response.json()) as Replay;
}

export interface UseSessionReplayResult {
  replay: Replay | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useSessionReplay(sessionId: string, enabled: boolean): UseSessionReplayResult {
  const query = useQuery({
    queryKey: ["sessions", sessionId, "replay"],
    queryFn: () => fetchReplay(sessionId),
    enabled: enabled && sessionId.length > 0,
  });

  return {
    replay: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
