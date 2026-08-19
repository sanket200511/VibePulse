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
    risk_score: 85,
    risk_level: "HIGH",
    risk_factors: [
      { label: "Hardcoded credential pattern detected (SEC001)", score: 50, category: "Security" },
      { label: "Sensitive configuration file modified", score: 20, category: "Configuration" },
      { label: "Authentication logic modified", score: 15, category: "Authentication" },
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
        description: "Composite risk score evaluated at 85/100",
        kind: "RISK_ESCALATION",
        severity: "HIGH",
      },
    ],
    recommendation: "Move secret to environment variables or secret management storage.",
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
        // Fallback to legacy endpoint if needed
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
        has_more: false,
      } as InvestigationResponse,
      isLoading: false,
      isError: false,
    };
  }

  return query;
}
