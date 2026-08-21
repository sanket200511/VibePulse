import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs } from "../../lib/ws-client";
import type { DevelopmentEvent } from "../events/types";
import { useDemoMode } from "../../demo/config";

export interface ScoreBreakdown {
  activity_acceleration: number;
  security_recurrence: number;
  hotspot_concentration: number;
  sensitive_surface_touch: number;
  resolution_regression: number;
  trend_persistence: number;
  explanation: string[];
}

export interface PredictiveSignal {
  prediction_id: string;
  project_id: string;
  prediction_type:
    | "SECURITY_RECURRENCE"
    | "ENGINEERING_HOTSPOT"
    | "CHANGE_BURST"
    | "INCIDENT_RECURRENCE"
    | "RESOLUTION_REGRESSION"
    | "FOCUS_DRIFT"
    | "SURFACE_EXPANSION";
  title: string;
  summary: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  forecast_score: number;
  evidence_strength: "STRONG" | "MODERATE" | "LOW" | "INSUFFICIENT";
  time_horizon: "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM";
  contributing_signals: string[];
  score_breakdown: ScoreBreakdown;
  affected_files: string[];
  affected_subsystems: string[];
  historical_window_days: number;
  recommended_action: string;
  investigation_incident_id?: string | null;
  provenance: "OBSERVED" | "INFERRED" | "UNKNOWN";
  created_at: string;
}

export interface HotspotItem {
  subsystem: string;
  file_path: string;
  hotspot_score: number;
  activity_count: number;
  findings_count: number;
  incident_count: number;
  trend: "ACCELERATING" | "STABLE" | "DECELERATING";
  recent_burst_events: number;
  explanation: string;
}

export interface PredictiveTrendPoint {
  date_label: string;
  event_count: number;
  finding_count: number;
  incident_count: number;
  resolved_count: number;
}

export interface EngineeringDriftSummary {
  previous_focus: string;
  current_focus: string;
  emerging_focus: string;
  drift_explanation: string;
  provenance: "OBSERVED" | "INFERRED" | "UNKNOWN";
}

export interface RecurringRiskItem {
  rule_id: string;
  title: string;
  occurrence_count: number;
  first_seen?: string | null;
  last_seen?: string | null;
  affected_files: string[];
  trend: "INCREASING" | "PERSISTENT" | "RESOLVING";
  investigation_incident_id?: string | null;
}

export interface PredictiveSummary {
  project_id: string;
  project_display_name: string;
  status: "READY" | "INSUFFICIENT_EVIDENCE";
  status_message: string;
  total_predictions: number;
  critical_count: number;
  high_count: number;
  active_hotspots_count: number;
  recurring_risks_count: number;
  engineering_drift: EngineeringDriftSummary;
  forecast_signals: PredictiveSignal[];
  hotspots: HotspotItem[];
  recurring_risks: RecurringRiskItem[];
  trends: PredictiveTrendPoint[];
  generated_at: string;
}

export function usePredictiveSummary(projectId: string | undefined) {
  const { isDemo } = useDemoMode();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["predictive-summary", projectId], [projectId]);

  const query = useQuery<PredictiveSummary>({
    queryKey,
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/predictions`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch predictive intelligence");
      return res.json() as Promise<PredictiveSummary>;
    },
    enabled: !isDemo && !!projectId,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });

  useEffect(() => {
    if (isDemo || !projectId) return;
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
          void queryClient.invalidateQueries({ queryKey: ["predictive-summary", projectId] });
          void queryClient.invalidateQueries({ queryKey: ["predictive-hotspots", projectId] });
          void queryClient.invalidateQueries({ queryKey: ["predictive-trends", projectId] });
        }
      },
    });
    return () => wsClient.close();
  }, [isDemo, projectId, queryClient]);

  return query;
}

export function useHotspots(projectId: string | undefined) {
  return useQuery<HotspotItem[]>({
    queryKey: ["predictive-hotspots", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/predictions/hotspots`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch hotspots");
      return res.json() as Promise<HotspotItem[]>;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
}

export function usePredictiveTrends(projectId: string | undefined) {
  return useQuery<PredictiveTrendPoint[]>({
    queryKey: ["predictive-trends", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/predictions/trends`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json() as Promise<PredictiveTrendPoint[]>;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshPredictions(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/predictions/refresh`, getApiBaseUrl());
      const res = await fetch(url.toString(), { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh predictions");
      return res.json() as Promise<PredictiveSummary>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["predictive-summary", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["predictive-hotspots", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["predictive-trends", projectId] });
    },
  });
}
