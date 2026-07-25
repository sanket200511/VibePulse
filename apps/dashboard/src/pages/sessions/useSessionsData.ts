/**
 * Loads recent sessions once (GET /sessions) then keeps the list current via
 * the /ws/sessions broadcast — no polling. Mirrors useEventsFeed.ts.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs, type WsStatus } from "../../lib/ws-client";
import type { Session } from "./types";
import { useDemoMode } from "../../demo/config";
import { demoSessionsList } from "../../demo/data";

interface SessionsResponse {
  sessions: Session[];
}

interface SessionBroadcast {
  type: "session.started" | "session.updated" | "session.idle" | "session.completed";
  session: Session;
}

async function fetchRecentSessions(): Promise<Session[]> {
  const response = await fetch(new URL("/sessions", getApiBaseUrl()).toString());
  if (!response.ok) {
    throw new Error(`Failed to load sessions (${response.status})`);
  }
  const data = (await response.json()) as SessionsResponse;
  return data.sessions;
}

export interface UseSessionsDataResult {
  sessions: Session[];
  connectionStatus: WsStatus;
  isLoading: boolean;
  isError: boolean;
}

export function useSessionsData(): UseSessionsDataResult {
  const { isDemo } = useDemoMode();

  const initialQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: fetchRecentSessions,
    enabled: !isDemo,
  });

  const [sessions, setSessions] = useState<Session[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<WsStatus>("connecting");
  const sessionsById = useRef<Map<string, Session>>(new Map());

  useEffect(() => {
    if (isDemo) return;
    if (!initialQuery.data) return;
    setSessions(initialQuery.data);
    sessionsById.current = new Map(initialQuery.data.map((session) => [session.id, session]));
  }, [initialQuery.data, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    const client = connectWs({
      url: getWsUrl("/ws/sessions"),
      onStatusChange: setConnectionStatus,
      onMessage: (data) => {
        const broadcast = data as SessionBroadcast;
        if (!broadcast?.session?.id) return;
        sessionsById.current.set(broadcast.session.id, broadcast.session);
        setSessions((prev) => {
          const withoutUpdated = prev.filter((s) => s.id !== broadcast.session.id);
          return [broadcast.session, ...withoutUpdated].sort(
            (a, b) => new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime(),
          );
        });
      },
    });

    return () => client.close();
  }, [isDemo]);

  if (isDemo) {
    return {
      sessions: demoSessionsList,
      connectionStatus: "open",
      isLoading: false,
      isError: false,
    };
  }

  return {
    sessions,
    connectionStatus,
    isLoading: initialQuery.isLoading,
    isError: initialQuery.isError,
  };
}
