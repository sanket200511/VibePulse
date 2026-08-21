import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getWsUrl } from "../../lib/api-config";
import { connectWs, type WsStatus } from "../../lib/ws-client";
import { useProjectHealth } from "../projects/useProjectHealth";
import { usePredictiveSummary } from "../predictions/usePredictions";
import { useSecurityIntelligence } from "../security/useSecurityIntelligence";
import type { DevelopmentEvent } from "../events/types";
import { useDemoMode } from "../../demo/config";

export type IntelligenceStage =
  "OBSERVE" | "DETECT" | "INVESTIGATE" | "RESOLVE" | "LEARN" | "ANTICIPATE" | "HEALTH";

export interface LiveCascadeEvent extends DevelopmentEvent {
  cascadeStage?: IntelligenceStage;
  findingsCount?: number;
  incidentSeverity?: string;
  hasRegression?: boolean;
}

export function useCommandCenter(projectId: string | undefined, projectRoot: string | undefined) {
  const { isDemo } = useDemoMode();
  const queryClient = useQueryClient();

  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [liveEvents, setLiveEvents] = useState<LiveCascadeEvent[]>([]);
  const [activeStage, setActiveStage] = useState<IntelligenceStage>("HEALTH");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Reusable Canonical Intelligence Queries
  const healthQuery = useProjectHealth(projectId);
  const predictionsQuery = usePredictiveSummary(projectId);
  const securityQuery = useSecurityIntelligence(projectId);

  // Invalidate queries helper
  const invalidateAll = useCallback(() => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: ["project-health", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["project-priorities", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["predictive-summary", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["project_security_intelligence", projectId] });
  }, [projectId, queryClient]);

  // Connect WebSocket
  useEffect(() => {
    if (isDemo || !projectId) return;

    const wsClient = connectWs({
      url: getWsUrl("/ws/events"),
      onStatusChange: (status) => setWsStatus(status),
      onMessage: (rawMsg: unknown) => {
        const msg = rawMsg as {
          type?: string;
          event_type?: string;
          project_root?: string;
          project_id?: string;
          event?: DevelopmentEvent;
          finding?: { rule_id: string; severity: string };
        };

        const isMatch =
          msg.project_id === projectId ||
          msg.project_root === projectRoot ||
          msg.event?.project_root === projectRoot;

        if (isMatch) {
          // Trigger intelligence cascade animation
          if (msg.finding || msg.event_type === "SECURITY_ANALYSIS") {
            setActiveStage("DETECT");
          } else if (msg.event_type === "INCIDENT_DETECTED" || msg.type === "INCIDENT_UPDATED") {
            setActiveStage("INVESTIGATE");
          } else if (msg.type === "RESOLUTION_RECORDED") {
            setActiveStage("RESOLVE");
          } else {
            setActiveStage("OBSERVE");
          }

          // Reset active stage to HEALTH after 2.5s
          setTimeout(() => {
            setActiveStage("HEALTH");
          }, 2500);

          if (msg.event) {
            setLiveEvents((prev) => [msg.event as LiveCascadeEvent, ...prev.slice(0, 49)]);
          }

          invalidateAll();
        }
      },
    });

    return () => wsClient.close();
  }, [isDemo, projectId, projectRoot, invalidateAll]);

  const selectedEvent = liveEvents.find((e) => e.id === selectedEventId) || liveEvents[0] || null;

  return {
    wsStatus,
    activeStage,
    liveEvents,
    selectedEvent,
    setSelectedEventId,
    health: healthQuery.data,
    predictions: predictionsQuery.data,
    security: securityQuery.security,
    isLoading: healthQuery.isLoading || predictionsQuery.isLoading || securityQuery.isLoading,
    isError: healthQuery.isError,
    refreshAll: invalidateAll,
  };
}
