/**
 * Loads the Session Replay (GET /sessions/{id}/replay) for the Session
 * Details page. Read-only, historical data — no WebSocket subscription.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Replay } from "./replay-types";
import { useDemoMode } from "../../demo/config";
import { demoReplayData } from "../../demo/data";

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
  const { isDemo } = useDemoMode();

  const query = useQuery({
    queryKey: ["sessions", sessionId, "replay"],
    queryFn: () => fetchReplay(sessionId),
    enabled: !isDemo && enabled && sessionId.length > 0,
  });

  if (isDemo) {
    if (sessionId === "session_vibesync_001") {
      return {
        replay: demoReplayData,
        isLoading: false,
        isError: false,
      };
    }
    return {
      replay: undefined,
      isLoading: false,
      isError: false,
    };
  }

  return {
    replay: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
