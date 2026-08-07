import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs } from "../../lib/ws-client";
import type { DevelopmentEvent } from "../events/types";

export interface SubsequentEvent {
  event_type: string;
  timestamp: string;
  details: Record<string, string | number | boolean | null>;
}

export interface AIInteractionTimelineEntry {
  event_id: string;
  event_type: string;
  timestamp: string;
  provider: string | null;
  model: string | null;
  interaction_type: string | null;
  conversation_id: string | null;
  request_id: string | null;
  prompt_size_bytes: number | null;
  response_size_bytes: number | null;
  tool_count: number | null;
  files_modified_afterwards: string[];
  architecture_events_afterwards: SubsequentEvent[];
  security_events_afterwards: SubsequentEvent[];
}

export interface AIProvenanceStats {
  total_interactions: number;
  total_tools_executed: number;
  providers_used: string[];
  models_used: string[];
}

export interface AIProvenanceResponse {
  stats: AIProvenanceStats;
  timeline: AIInteractionTimelineEntry[];
}

export function useProjectAIProvenance(projectId?: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["project", projectId, "ai-provenance"], [projectId]);

  const query = useQuery<AIProvenanceResponse>({
    queryKey,
    queryFn: async () => {
      if (!projectId) throw new Error("No project ID");
      const res = await fetch(`${getApiBaseUrl()}/projects/${projectId}/ai-provenance`);
      if (!res.ok) throw new Error("Failed to fetch AI provenance");
      return res.json() as Promise<AIProvenanceResponse>;
    },
    enabled: !!projectId,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!projectId) return;

    const wsClient = connectWs({
      url: getWsUrl("/ws/events"),
      onMessage: (rawMsg: unknown) => {
        const msg = rawMsg as { type: string; event?: DevelopmentEvent; project_root?: string };
        if (msg.event?.project_root === projectId || msg.project_root === projectId || msg.event) {
          if (msg.event && msg.event.event_type.startsWith("AI_")) {
            queryClient.setQueryData<AIProvenanceResponse>(queryKey, (old) => {
              if (!old) return old;
              const newEntry: AIInteractionTimelineEntry = {
                event_id: msg.event!.id,
                event_type: msg.event!.event_type,
                timestamp: msg.event!.timestamp,
                provider: (msg.event!.metadata?.provider as string) || null,
                model: (msg.event!.metadata?.model as string) || null,
                interaction_type: (msg.event!.metadata?.interaction_type as string) || null,
                conversation_id: null,
                request_id: null,
                prompt_size_bytes: null,
                response_size_bytes: null,
                tool_count: null,
                files_modified_afterwards: [],
                architecture_events_afterwards: [],
                security_events_afterwards: [],
              };
              return {
                ...old,
                stats: {
                  ...old.stats,
                  total_interactions: old.stats.total_interactions + 1,
                },
                timeline: [newEntry, ...old.timeline],
              };
            });
          } else {
            void queryClient.invalidateQueries({ queryKey });
          }
        }
      },
    });

    return () => wsClient.close();
  }, [projectId, queryClient, queryKey]);

  return query;
}

export function useSessionAIProvenance(sessionId?: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["session", sessionId, "ai-provenance"], [sessionId]);

  const query = useQuery<AIProvenanceResponse>({
    queryKey,
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID");
      const res = await fetch(`${getApiBaseUrl()}/sessions/${sessionId}/ai-provenance`);
      if (!res.ok) throw new Error("Failed to fetch AI provenance");
      return res.json() as Promise<AIProvenanceResponse>;
    },
    enabled: !!sessionId,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!sessionId) return;

    const wsClient = connectWs({
      url: getWsUrl("/ws/events"),
      onMessage: (rawMsg: unknown) => {
        const msg = rawMsg as { type: string; event?: DevelopmentEvent; session_id?: string };
        if (msg.event?.session_id === sessionId || msg.session_id === sessionId) {
          if (msg.event && msg.event.event_type.startsWith("AI_")) {
            queryClient.setQueryData<AIProvenanceResponse>(queryKey, (old) => {
              if (!old) return old;
              const newEntry: AIInteractionTimelineEntry = {
                event_id: msg.event!.id,
                event_type: msg.event!.event_type,
                timestamp: msg.event!.timestamp,
                provider: (msg.event!.metadata?.provider as string) || null,
                model: (msg.event!.metadata?.model as string) || null,
                interaction_type: (msg.event!.metadata?.interaction_type as string) || null,
                conversation_id: null,
                request_id: null,
                prompt_size_bytes: null,
                response_size_bytes: null,
                tool_count: null,
                files_modified_afterwards: [],
                architecture_events_afterwards: [],
                security_events_afterwards: [],
              };
              return {
                ...old,
                stats: {
                  ...old.stats,
                  total_interactions: old.stats.total_interactions + 1,
                },
                timeline: [newEntry, ...old.timeline],
              };
            });
          } else {
            void queryClient.invalidateQueries({ queryKey });
          }
        }
      },
    });

    return () => wsClient.close();
  }, [sessionId, queryClient, queryKey]);

  return query;
}
