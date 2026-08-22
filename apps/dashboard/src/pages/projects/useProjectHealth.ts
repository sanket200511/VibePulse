import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs } from "../../lib/ws-client";
import type { DevelopmentEvent } from "../events/types";

export interface HealthDimension {
  name: string;
  dimension_key:
    | "security_health"
    | "engineering_stability"
    | "incident_health"
    | "resolution_health"
    | "predictive_risk_health";
  score: number;
  status: "OPTIMAL" | "STABLE" | "NEEDS_ATTENTION" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
  weight: number;
  contributing_signals: string[];
  explanation: string;
  provenance: "OBSERVED" | "INFERRED" | "UNKNOWN";
}

export interface ProjectPriorityItem {
  priority_id: string;
  rank: number;
  category:
    | "REGRESSION_ALERT"
    | "CRITICAL_INCIDENT"
    | "SECURITY_REMEDIATION"
    | "HOTSPOT_REVIEW"
    | "PREDICTIVE_PREVENTION";
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority_score: number;
  why_ranked_highly: string;
  contributing_evidence: string[];
  affected_files: string[];
  affected_subsystem: string;
  recommended_action: string;
  deep_link_url?: string | null;
  provenance: "OBSERVED" | "INFERRED" | "UNKNOWN";
}

export interface UnifiedProjectHealth {
  project_id: string;
  project_display_name: string;
  overall_health_score: number | null;
  grade:
    "EXCELLENT" | "HEALTHY" | "NEEDS_ATTENTION" | "DEGRADED" | "CRITICAL" | "INSUFFICIENT_EVIDENCE";
  status: "READY" | "INSUFFICIENT_EVIDENCE";
  status_message: string;
  security_health: HealthDimension;
  engineering_stability: HealthDimension;
  incident_health: HealthDimension;
  resolution_health: HealthDimension;
  predictive_risk_health: HealthDimension;
  top_priorities: ProjectPriorityItem[];
  open_incidents_count: number;
  resolved_incidents_count: number;
  active_security_findings_count: number;
  active_hotspots_count: number;
  active_forecasts_count: number;
  generated_at: string;
}

export function useProjectHealth(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["project-health", projectId], [projectId]);

  const query = useQuery<UnifiedProjectHealth>({
    queryKey,
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/health`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch project health");
      return res.json() as Promise<UnifiedProjectHealth>;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!projectId) return;
    const wsClient = connectWs({
      url: getWsUrl("/ws/events"),
      onMessage: (rawMsg: unknown) => {
        const msg = rawMsg as {
          type: string;
          event?: DevelopmentEvent;
          project_root?: string;
          project_id?: string;
        };
        if (
          msg.event?.project_root === projectId ||
          msg.project_root === projectId ||
          msg.project_id === projectId
        ) {
          void queryClient.invalidateQueries({ queryKey: ["project-health", projectId] });
          void queryClient.invalidateQueries({ queryKey: ["project-priorities", projectId] });
        }
      },
    });
    return () => wsClient.close();
  }, [projectId, queryClient]);

  return query;
}

export function useProjectPriorities(projectId: string | undefined) {
  return useQuery<ProjectPriorityItem[]>({
    queryKey: ["project-priorities", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/health/priorities`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch project priorities");
      return res.json() as Promise<ProjectPriorityItem[]>;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshProjectHealth(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/health/refresh`, getApiBaseUrl());
      const res = await fetch(url.toString(), { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh project health");
      return res.json() as Promise<UnifiedProjectHealth>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-health", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-priorities", projectId] });
    },
  });
}
