import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { getApiBaseUrl, getWsUrl } from "../../lib/api-config";
import { connectWs } from "../../lib/ws-client";
import type { DevelopmentEvent } from "../events/types";
import { useDemoMode } from "../../demo/config";

export interface InvestigationArchitectureChange {
  kind: string;
  symbol: string;
}

export interface InvestigationSecurityFinding {
  rule_id: string;
  severity: string;
  message: string;
  file?: string | null;
  line_number?: number | null;
  redacted_evidence?: string | null;
  category?: string | null;
  recommendation?: string | null;
  risk_contribution?: number;
  provenance?: string;
}

export interface InvestigationAIEvent {
  provider: string;
  model: string;
  interaction_type: string | null;
}

export interface RiskFactor {
  label: string;
  score: number;
  category: string;
}

export interface EvidenceStep {
  timestamp: string;
  title: string;
  description: string;
  kind: "FILE_CHANGE" | "PATTERN_MATCH" | "CORRELATION" | "RISK_ESCALATION" | string;
  severity?: string | null;
  file?: string | null;
}

export interface EvidenceNode {
  id: string;
  step_number: number;
  title: string;
  subtitle: string;
  kind: string;
  timestamp: string;
  severity?: string | null;
  file?: string | null;
  details?: Record<string, unknown>;
  provenance?: string;
}

export interface EvidenceGraphEdge3 {
  source_id: string;
  target_id: string;
  relationship_label: string;
}

export interface EvidenceGraph3 {
  nodes: EvidenceNode[];
  edges: EvidenceGraphEdge3[];
}

export interface IncidentStory {
  title: string;
  summary: string;
  narrative_paragraphs: string[];
  provenance: string;
}

export interface TimelineStep3 {
  timestamp: string;
  event_id: string;
  event_type: string;
  file_path?: string | null;
  session_id?: string | null;
  security_finding?: string | null;
  risk_change?: string | null;
  description: string;
  provenance: string;
}

export interface RiskEvolutionStep {
  timestamp?: string | null;
  factor: string;
  points_added: number;
  running_score: number;
  category: string;
}

export interface RiskEvolution {
  initial_score: number;
  final_score: number;
  risk_level: string;
  steps: RiskEvolutionStep[];
}

export interface RootCauseAnalysis {
  primary_signal: string;
  contributing_signals: string[];
  assessment: string;
  provenance: string;
}

export interface EngineeringDNACorrelation {
  normal_focus_dirs: string[];
  incident_surface_files: string[];
  is_surface_deviation: boolean;
  analysis_summary: string;
  provenance: string;
}

export interface AffectedSurfaceItem {
  subsystem: string;
  file_count: number;
  files: string[];
  findings_count: number;
}

export interface AffectedSurfaceSummary {
  breakdown: AffectedSurfaceItem[];
  most_affected_file?: string | null;
  total_findings: number;
}

export interface ResolutionRecommendation {
  rule_id: string;
  title: string;
  why: string;
  recommended_actions: string[];
  verification_steps: string[];
}

export interface IncidentReviewHistoryItem {
  id: string;
  incident_id: string;
  previous_status: string;
  new_status: string;
  resolution_note?: string | null;
  reviewer: string;
  created_at: string;
}

export interface IncidentReviewHistoryResponse {
  incident_id: string;
  current_status: string;
  history: IncidentReviewHistoryItem[];
}

export interface IncidentMetrics {
  project_id: string;
  open_incidents: number;
  investigating_incidents: number;
  resolved_incidents: number;
  total_incidents: number;
  total_transitions: number;
  resolution_rate_percent?: number | null;
  avg_resolution_time_seconds?: number | null;
  status_note: string;
}

export interface ProjectHealthSummary {
  project_id: string;
  project_display_name: string;
  security_posture: string;
  risk_score: number;
  open_incidents: number;
  resolved_incidents: number;
  recent_incident_activity: number;
  most_affected_subsystem: string;
  recurring_rule?: string | null;
  total_events: number;
}

export interface IncidentReviewRecord {
  status: "OPEN" | "INVESTIGATING" | "REVIEWED" | "RESOLVED" | string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  updated_at?: string | null;
}

export interface InvestigationIncidentDetail {
  investigation_id: string;
  project_id: string;
  project_display_name: string;
  incident_id: string;
  title: string;
  summary: string;
  status: "OPEN" | "INVESTIGATING" | "REVIEWED" | "RESOLVED" | string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  risk_score: number;
  confidence: string;
  started_at: string;
  detected_at: string;
  last_activity_at: string;
  session_ids: string[];
  affected_files: string[];
  related_events_count: number;
  security_findings: InvestigationSecurityFinding[];
  story: IncidentStory;
  timeline: TimelineStep3[];
  risk_evolution: RiskEvolution;
  root_cause: RootCauseAnalysis;
  engineering_dna: EngineeringDNACorrelation;
  affected_surface: AffectedSurfaceSummary;
  evidence_graph: EvidenceGraph3;
  remediation_steps: string[];
  remediation_guidance: string;
  resolution_recommendations: ResolutionRecommendation[];
  review_record: IncidentReviewRecord;
  review_history: IncidentReviewHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface InvestigationResult {
  id: string;
  timestamp: string;
  project_root: string;
  project_name?: string | null;
  session_id: string;
  file_path: string | null;
  file_name?: string | null;
  language: string | null;
  event_type: string;
  summary: string;
  risk_score: number;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  status?: string;
  risk_factors: RiskFactor[];
  evidence_chain: EvidenceStep[];
  evidence_nodes: EvidenceNode[];
  affected_files: string[];
  correlated_events_count: number;
  recommendation?: string | null;
  architecture_changes: InvestigationArchitectureChange[];
  security_findings: InvestigationSecurityFinding[];
  ai_event: InvestigationAIEvent | null;
  replay_link: string | null;
  timeline_position: number | null;
}

export interface InvestigationResponse {
  results: InvestigationResult[];
  total_count: number;
  security_findings_count: number;
  critical_count: number;
  suspicious_count: number;
  high_risk_count: number;
  sessions_count: number;
  projects_count: number;
  has_more: boolean;
}

export function useInvestigation(projectId: string | undefined, queryStr: string) {
  const { isDemo } = useDemoMode();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["investigation", projectId, queryStr], [projectId, queryStr]);

  const query = useQuery<InvestigationResponse>({
    queryKey,
    queryFn: async () => {
      const endpoint = projectId
        ? `/api/projects/${projectId}/investigation/search`
        : "/api/investigation/search";
      const url = new URL(endpoint, getApiBaseUrl());
      if (queryStr) {
        url.searchParams.set("q", queryStr);
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Failed to fetch investigation results");
      }
      return res.json() as Promise<InvestigationResponse>;
    },
    enabled: !isDemo,
    refetchOnWindowFocus: false,
    staleTime: 2000,
  });

  useEffect(() => {
    if (isDemo) return;
    const wsClient = connectWs({
      url: getWsUrl("/ws/events"),
      onMessage: (rawMsg: unknown) => {
        const msg = rawMsg as {
          type: string;
          event?: DevelopmentEvent;
          project_root?: string;
          project_id?: string;
          incident_id?: string;
        };
        if (
          !projectId ||
          msg.event?.project_root === projectId ||
          msg.project_root === projectId ||
          msg.project_id === projectId
        ) {
          void queryClient.invalidateQueries({ queryKey: ["investigation"] });
          void queryClient.invalidateQueries({ queryKey: ["incident-detail"] });
          void queryClient.invalidateQueries({ queryKey: ["incident-history"] });
          void queryClient.invalidateQueries({ queryKey: ["incident-metrics"] });
          void queryClient.invalidateQueries({ queryKey: ["project-health-summary"] });
        }
      },
    });
    return () => wsClient.close();
  }, [isDemo, projectId, queryClient]);

  return query;
}

export function useIncidentDetail(projectId: string | undefined, incidentId: string | null) {
  return useQuery<InvestigationIncidentDetail>({
    queryKey: ["incident-detail", projectId, incidentId],
    queryFn: async () => {
      if (!projectId || !incidentId) throw new Error("Missing projectId or incidentId");
      const url = new URL(
        `/api/projects/${projectId}/investigations/${incidentId}`,
        getApiBaseUrl(),
      );
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch incident investigation");
      return res.json() as Promise<InvestigationIncidentDetail>;
    },
    enabled: !!projectId && !!incidentId,
    refetchOnWindowFocus: false,
  });
}

export function useIncidentHistory(projectId: string | undefined, incidentId: string | null) {
  return useQuery<IncidentReviewHistoryResponse>({
    queryKey: ["incident-history", projectId, incidentId],
    queryFn: async () => {
      if (!projectId || !incidentId) throw new Error("Missing parameters");
      const url = new URL(
        `/api/projects/${projectId}/investigations/${incidentId}/history`,
        getApiBaseUrl(),
      );
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch incident history");
      return res.json() as Promise<IncidentReviewHistoryResponse>;
    },
    enabled: !!projectId && !!incidentId,
    refetchOnWindowFocus: false,
  });
}

export function useIncidentMetrics(projectId: string | undefined) {
  return useQuery<IncidentMetrics>({
    queryKey: ["incident-metrics", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(`/api/projects/${projectId}/investigations/metrics`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch incident metrics");
      return res.json() as Promise<IncidentMetrics>;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
}

export function useProjectHealthSummary(projectId: string | undefined) {
  return useQuery<ProjectHealthSummary>({
    queryKey: ["project-health-summary", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const url = new URL(
        `/api/projects/${projectId}/investigations/health-summary`,
        getApiBaseUrl(),
      );
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch project health summary");
      return res.json() as Promise<ProjectHealthSummary>;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateIncidentReview(projectId: string | undefined, incidentId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      status: string;
      reviewed_by?: string | undefined;
      resolution_note?: string | undefined;
    }) => {
      if (!projectId || !incidentId) throw new Error("Missing parameters");
      const url = new URL(
        `/api/projects/${projectId}/investigations/${incidentId}/review`,
        getApiBaseUrl(),
      );
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update incident review status");
      return res.json() as Promise<IncidentReviewRecord>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incident-detail", projectId, incidentId] });
      void queryClient.invalidateQueries({ queryKey: ["incident-history", projectId, incidentId] });
      void queryClient.invalidateQueries({ queryKey: ["incident-metrics", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-health-summary", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["investigation"] });
    },
  });
}
