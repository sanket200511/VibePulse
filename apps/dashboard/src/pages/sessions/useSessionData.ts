/**
 * Loads a single session (GET /sessions/{id}) — used by the Session Details
 * page to know the session's status, which gates Replay visibility to
 * COMPLETED sessions only (docs/adr/0008-replay-engine.md §5).
 */

import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Session } from "./types";

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
  const query = useQuery({
    queryKey: ["sessions", sessionId],
    queryFn: () => fetchSession(sessionId),
    enabled: sessionId.length > 0,
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
