/**
 * Loads recent events once (GET /events) then keeps the list current via
 * the /ws/events broadcast — no polling.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs, type WsStatus } from "../../lib/ws-client";
import type { DevelopmentEvent } from "./types";

// Bounds memory for a long-running session; the feed shows recent activity,
// not a full history.
const MAX_EVENTS = 200;

interface EventsResponse {
  events: DevelopmentEvent[];
}

async function fetchRecentEvents(): Promise<DevelopmentEvent[]> {
  const response = await fetch(new URL("/events", getApiBaseUrl()).toString());
  if (!response.ok) {
    throw new Error(`Failed to load events (${response.status})`);
  }
  const data = (await response.json()) as EventsResponse;
  return data.events;
}

export interface UseEventsFeedResult {
  events: DevelopmentEvent[];
  connectionStatus: WsStatus;
  isLoading: boolean;
  isError: boolean;
}

export function useEventsFeed(): UseEventsFeedResult {
  const initialQuery = useQuery({
    queryKey: ["events"],
    queryFn: fetchRecentEvents,
  });

  const [events, setEvents] = useState<DevelopmentEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<WsStatus>("connecting");
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialQuery.data) return;
    setEvents(initialQuery.data);
    seenIds.current = new Set(initialQuery.data.map((event) => event.id));
  }, [initialQuery.data]);

  useEffect(() => {
    const client = connectWs({
      url: getWsUrl("/ws/events"),
      onStatusChange: setConnectionStatus,
      onMessage: (data) => {
        const event = data as DevelopmentEvent;
        if (seenIds.current.has(event.id)) return;
        seenIds.current.add(event.id);
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      },
    });

    return () => client.close();
  }, []);

  return {
    events,
    connectionStatus,
    isLoading: initialQuery.isLoading,
    isError: initialQuery.isError,
  };
}
