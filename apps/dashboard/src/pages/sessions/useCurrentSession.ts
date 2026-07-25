/**
 * Tracks the single session currently ACTIVE or IDLE for the SessionBanner.
 *
 * Loads GET /sessions/current once, then keeps it live via /ws/sessions —
 * accepting session.started/updated/idle for the tracked session (or
 * adopting a new one on session.started) and clearing on session.completed.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const initialQuery = useQuery({
    queryKey: ["sessions", "current"],
    queryFn: fetchCurrentSession,
    enabled: !isDemo,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<WsStatus>("connecting");
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    if (initialQuery.data === undefined) return;
    setSession(initialQuery.data);
    currentId.current = initialQuery.data?.id ?? null;
  }, [initialQuery.data, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    const client = connectWs({
      url: getWsUrl("/ws/sessions"),
      onStatusChange: setConnectionStatus,
      onMessage: (data) => {
        const broadcast = data as SessionBroadcast;
        if (!broadcast?.session?.id) return;

        if (broadcast.type === "session.started") {
          currentId.current = broadcast.session.id;
          setSession(broadcast.session);
          return;
        }

        if (broadcast.session.id !== currentId.current) return;

        if (broadcast.type === "session.completed") {
          currentId.current = null;
          setSession(null);
          return;
        }

        setSession(broadcast.session);
      },
    });

    return () => client.close();
  }, [isDemo]);

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
    isLoading: initialQuery.isLoading,
  };
}
