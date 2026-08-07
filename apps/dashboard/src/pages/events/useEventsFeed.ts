/**
 * Loads recent events once (GET /events) then keeps the list current via
 * the /ws/events broadcast — no polling.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<WsStatus>("connecting");

  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["events"],
    queryFn: fetchRecentEvents,
  });

  useEffect(() => {
    const client = connectWs({
      url: getWsUrl("/ws/events"),
      onStatusChange: setConnectionStatus,
      onMessage: (data) => {
        const event = data as DevelopmentEvent;
        queryClient.setQueryData<DevelopmentEvent[]>(["events"], (oldEvents) => {
          if (!oldEvents) return [event];
          if (oldEvents.some((e) => e.id === event.id)) return oldEvents;
          return [event, ...oldEvents].slice(0, MAX_EVENTS);
        });
      },
    });

    return () => client.close();
  }, [queryClient]);

  return {
    events,
    connectionStatus,
    isLoading,
    isError,
  };
}
