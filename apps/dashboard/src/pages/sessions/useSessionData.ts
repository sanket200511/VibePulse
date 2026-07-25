/**
 * Loads a single session (GET /sessions/{id}) — used by the Session Details
 * page to know the session's status, which gates Replay visibility to
 * COMPLETED sessions only.
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Session } from "./types";
import { useDemoMode } from "../../demo/config";
import { demoActiveSession, demoCompletedSession } from "../../demo/data";

async function fetchSession(sessionId: string): Promise<Session> {
  const response = await fetch(new URL(`/sessions/${sessionId}`, getApiBaseUrl()).toString());
  if (!response.ok) {
    throw new Error(`Failed to load session (${response.status})`);
  }
  return (await response.json()) as Session;
}

export interface UseSessionDataResult {
  session: Session | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useSessionData(sessionId: string): UseSessionDataResult {
  const { isDemo } = useDemoMode();

  const query = useQuery({
    queryKey: ["sessions", sessionId],
    queryFn: () => fetchSession(sessionId),
    enabled: !isDemo && sessionId.length > 0,
  });

  if (isDemo) {
    let session = undefined;
    if (sessionId === "session_vibesync_002") {
      session = demoActiveSession;
    } else if (sessionId === "session_vibesync_001") {
      session = demoCompletedSession;
    }
    return {
      session,
      isLoading: false,
      isError: false,
    };
  }

  return {
    session: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
