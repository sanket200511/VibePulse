import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  kind: "SESSION_START" | "FILE_CHANGE" | "PATTERN_MATCH" | "RISK_ESCALATION" | "INVESTIGATION_CREATED" | string;
  timestamp: string;
  severity?: string | null;
  file?: string | null;
  details?: Record<string, unknown>;
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
  suspicious_count: number;
  high_risk_count: number;
  sessions_count: number;
  projects_count: number;
  has_more: boolean;
}

const DEMO_RESULTS: InvestigationResult[] = [
  {
    id: "demo-inv-001",
    timestamp: new Date().toISOString(),
    project_root: "D:\\VibePulse-Demo",
    project_name: "VibePulse-Demo",
    session_id: "session-demo-001",
    file_path: "config/settings.py",
    file_name: "settings.py",
    language: "Python",
    event_type: "FILE_MODIFIED",
    summary: "Security Alert: Hardcoded API Key Detected (SEC001)",
    risk_score: 87,
    risk_level: "HIGH",
    risk_factors: [
      { label: "Hardcoded credential pattern detected (SEC001)", score: 50, category: "Security" },
      { label: "Sensitive configuration file modified", score: 20, category: "Configuration" },
      { label: "Authentication-related file modified", score: 10, category: "Authentication" },
      { label: "Multiple related changes in short interval", score: 7, category: "Timing" },
    ],
    evidence_chain: [
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        title: "src/auth.py modified",
        description: "Authentication verification routines modified",
        kind: "FILE_CHANGE",
        file: "src/auth.py",
      },
      {
        timestamp: new Date(Date.now() - 15000).toISOString(),
        title: "config/settings.py modified",
        description: "Credentials written to configuration",
        kind: "FILE_CHANGE",
        file: "config/settings.py",
      },
      {
        timestamp: new Date(Date.now() - 10000).toISOString(),
        title: "Hardcoded API Key Detected",
        description: "SEC001 pattern match on line 12",
        kind: "PATTERN_MATCH",
        severity: "HIGH",
        file: "config/settings.py",
      },
      {
        timestamp: new Date().toISOString(),
        title: "Risk escalated to HIGH",
        description: "Composite risk score evaluated at 87/100",
        kind: "RISK_ESCALATION",
        severity: "HIGH",
      },
    ],
    evidence_nodes: [
      {
        id: "demo-node-1",
        step_number: 1,
        title: "Session Activity Initialized",
        subtitle: "Developer activity observed by local daemon",
        kind: "SESSION_START",
        timestamp: new Date(Date.now() - 45000).toISOString(),
        details: { source: "VibePulse Telemetry Daemon" },
      },
      {
        id: "demo-node-2",
        step_number: 2,
        title: "src/auth.py Modified",
        subtitle: "Authentication logic updated",
        kind: "FILE_CHANGE",
        timestamp: new Date(Date.now() - 30000).toISOString(),
        file: "src/auth.py",
        details: { event_type: "FILE_MODIFIED", file_path: "src/auth.py" },
      },
      {
        id: "demo-node-3",
        step_number: 3,
        title: "config/settings.py Modified",
        subtitle: "Configuration parameters changed",
        kind: "FILE_CHANGE",
        timestamp: new Date(Date.now() - 15000).toISOString(),
        file: "config/settings.py",
        details: { event_type: "FILE_MODIFIED", file_path: "config/settings.py" },
      },
      {
        id: "demo-node-4",
        step_number: 4,
        title: "Secret Pattern Detected",
        subtitle: "SEC001: Hardcoded Credential Detected",
        kind: "PATTERN_MATCH",
        timestamp: new Date(Date.now() - 10000).toISOString(),
        severity: "HIGH",
        file: "config/settings.py",
        details: {
          rule_id: "SEC001",
          pattern: "API_KEY",
          redacted_evidence: 'API_KEY = "********REDACTED********"',
          confidence: "HIGH",
          line_number: 12,
        },
      },
      {
        id: "demo-node-5",
        step_number: 5,
        title: "Risk Escalated: 37 → 87",
        subtitle: "Risk Score evaluated at 87/100 from 4 signals",
        kind: "RISK_ESCALATION",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        severity: "HIGH",
        details: { risk_score: 87, risk_level: "HIGH", contributing_factors: 4 },
      },
      {
        id: "demo-node-6",
        step_number: 6,
        title: "Investigation Incident Logged",
        subtitle: "Correlated incident ready for developer review and remediation",
        kind: "INVESTIGATION_CREATED",
        timestamp: new Date().toISOString(),
        details: { status: "ACTIVE_INVESTIGATION" },
      },
    ],
    affected_files: ["config/settings.py", "src/auth.py"],
    correlated_events_count: 6,
    recommendation: "Move secret to environment variables or secret management storage before committing.",
    architecture_changes: [],
    security_findings: [
      {
        rule_id: "SEC001",
        severity: "HIGH",
        message: "Hardcoded Secret Detected",
        file: "config/settings.py",
        line_number: 12,
        redacted_evidence: 'API_KEY = "********REDACTED********"',
        category: "Credentials",
        recommendation: "Move credentials to environment variables.",
      },
    ],
    ai_event: null,
    replay_link: "/sessions/session-demo-001/replay",
    timeline_position: 1,
  },
];

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
        const legacyUrl = new URL(
          projectId ? `/projects/${projectId}/investigation/search` : "/investigation/search",
          getApiBaseUrl(),
        );
        if (queryStr) legacyUrl.searchParams.set("q", queryStr);
        const legacyRes = await fetch(legacyUrl.toString());
        if (!legacyRes.ok) throw new Error("Failed to fetch investigation results");
        return legacyRes.json() as Promise<InvestigationResponse>;
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
        const msg = rawMsg as { type: string; event?: DevelopmentEvent; project_root?: string };
        if (!projectId || msg.event?.project_root === projectId || msg.project_root === projectId) {
          void queryClient.invalidateQueries({ queryKey: ["investigation"] });
        }
      },
    });
    return () => wsClient.close();
  }, [isDemo, projectId, queryClient]);

  if (isDemo) {
    const filtered = queryStr
      ? DEMO_RESULTS.filter(
          (r) =>
            r.summary.toLowerCase().includes(queryStr.toLowerCase()) ||
            r.file_path?.toLowerCase().includes(queryStr.toLowerCase()) ||
            r.security_findings.some((f) =>
              f.severity.toLowerCase().includes(queryStr.toLowerCase()),
            ),
        )
      : DEMO_RESULTS;

    return {
      data: {
        results: filtered,
        total_count: filtered.length,
        suspicious_count: 1,
        high_risk_count: 1,
        sessions_count: 1,
        projects_count: 1,
        has_more: false,
      } as InvestigationResponse,
      isLoading: false,
      isError: false,
    };
  }

  return query;
}
