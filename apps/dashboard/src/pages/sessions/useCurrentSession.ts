/**
 * Tracks the single session currently ACTIVE or IDLE for the SessionBanner.
 *
 * Loads GET /sessions/current once, then keeps it live via /ws/sessions —
 * accepting session.started/updated/idle for the tracked session (or
 * adopting a new one on session.started) and clearing on session.completed.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs, type WsStatus } from "../../lib/ws-client";
import type { Session } from "./types";
import { useDemoMode } from "../../demo/config";
import { demoActiveSession } from "../../demo/data";

interface SessionBroadcast {
  type: "session.started" | "session.updated" | "session.idle" | "session.completed";
  session: Session;
}

async function fetchCurrentSession(): Promise<Session | null> {
  const response = await fetch(new URL("/sessions/current", getApiBaseUrl()).toString());
  if (!response.ok) {
    throw new Error(`Failed to load current session (${response.status})`);
  }
  return (await response.json()) as Session | null;
}

export interface UseCurrentSessionResult {
  session: Session | null;
  connectionStatus: WsStatus;
  isLoading: boolean;
}

export function useCurrentSession(): UseCurrentSessionResult {
  const { isDemo } = useDemoMode();

  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<WsStatus>("connecting");

  const { data: session = null, isLoading } = useQuery({
    queryKey: ["sessions", "current"],
    queryFn: fetchCurrentSession,
    enabled: !isDemo,
  });

  useEffect(() => {
    if (isDemo) return;
    const client = connectWs({
      url: getWsUrl("/ws/sessions"),
      onStatusChange: setConnectionStatus,
      onMessage: (data) => {
        const broadcast = data as SessionBroadcast;
        if (!broadcast?.session?.id) return;

        queryClient.setQueryData<Session | null>(["sessions", "current"], (oldSession) => {
          if (broadcast.type === "session.started") {
            return broadcast.session;
          }
          if (oldSession && broadcast.session.id !== oldSession.id) {
            return oldSession;
          }
          if (broadcast.type === "session.completed") {
            return null;
          }
          return broadcast.session;
        });
      },
    });

    return () => client.close();
  }, [isDemo, queryClient]);

  if (isDemo) {
    return {
      session: demoActiveSession,
      connectionStatus: "open",
      isLoading: false,
    };
  }

  return {
    session,
    connectionStatus,
    isLoading,
  };
}
