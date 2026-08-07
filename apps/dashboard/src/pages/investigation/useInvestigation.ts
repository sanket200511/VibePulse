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
}

export interface InvestigationAIEvent {
  provider: string;
  model: string;
  interaction_type: string | null;
}

export interface InvestigationResult {
  id: string;
  timestamp: string;
  project_root: string;
  session_id: string;
  file_path: string | null;
  language: string | null;
  event_type: string;
  summary: string;
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
    timestamp: "2026-07-14T10:15:00Z",
    project_root: "d:/VibeSync",
    session_id: "session_vibesync_001",
    file_path: "src/observation/watcher.ts",
    language: "TypeScript",
    event_type: "FILE_MODIFIED",
    summary: "Added FileSystemWatcher class with configurable debounce and event filtering",
    architecture_changes: [{ kind: "CLASS_ADDED", symbol: "FileSystemWatcher" }],
    security_findings: [],
    ai_event: { provider: "Cursor", model: "claude-3-5-sonnet", interaction_type: "COMPLETION" },
    replay_link: "/sessions/session_vibesync_001/replay",
    timeline_position: 1,
  },
  {
    id: "demo-inv-002",
    timestamp: "2026-07-14T10:30:00Z",
    project_root: "d:/VibeSync",
    session_id: "session_vibesync_001",
    file_path: "src/observation/publisher.ts",
    language: "TypeScript",
    event_type: "FILE_MODIFIED",
    summary: "Refactored EventPublisher retry logic to use exponential backoff",
    architecture_changes: [
      { kind: "FUNCTION_ADDED", symbol: "withExponentialBackoff" },
      { kind: "FUNCTION_REMOVED", symbol: "simpleRetry" },
    ],
    security_findings: [],
    ai_event: null,
    replay_link: "/sessions/session_vibesync_001/replay",
    timeline_position: 2,
  },
  {
    id: "demo-inv-003",
    timestamp: "2026-07-14T11:00:00Z",
    project_root: "d:/VibeSync",
    session_id: "session_vibesync_001",
    file_path: "src/api/client.ts",
    language: "TypeScript",
    event_type: "FILE_MODIFIED",
    summary: "Detected use of eval() in API response parser — potential XSS vector",
    architecture_changes: [],
    security_findings: [
      { rule_id: "no-eval", severity: "HIGH", message: "Dangerous use of eval() detected" },
    ],
    ai_event: { provider: "Cursor", model: "claude-3-5-sonnet", interaction_type: "TOOL_USE" },
    replay_link: "/sessions/session_vibesync_001/replay",
    timeline_position: 3,
  },
];

export function useInvestigation(projectId: string | undefined, queryStr: string) {
  const { isDemo } = useDemoMode();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["investigation", projectId, queryStr], [projectId, queryStr]);

  // All hooks must be called unconditionally (Rules of Hooks)
  const query = useQuery<InvestigationResponse>({
    queryKey,
    queryFn: async () => {
      const url = new URL(
        projectId ? `/projects/${projectId}/investigation/search` : "/investigation/search",
        getApiBaseUrl(),
      );
      if (queryStr) {
        url.searchParams.set("q", queryStr);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch investigation results");
      return res.json() as Promise<InvestigationResponse>;
    },
    enabled: !isDemo,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });

  useEffect(() => {
    if (isDemo) return;
    const wsClient = connectWs({
      url: getWsUrl("/ws/events"),
      onMessage: (rawMsg: unknown) => {
        const msg = rawMsg as { type: string; event?: DevelopmentEvent; project_root?: string };
        if (!projectId || msg.event?.project_root === projectId || msg.project_root === projectId) {
          if (msg.event && (!queryStr || queryStr === "")) {
            queryClient.setQueryData<InvestigationResponse>(queryKey, (old) => {
              if (!old) return old;
              const newResult: InvestigationResult = {
                id: msg.event!.id,
                timestamp: msg.event!.timestamp,
                project_root: msg.event!.project_root,
                session_id: msg.event!.session_id,
                file_path: msg.event!.file_path,
                language: msg.event!.language,
                event_type: msg.event!.event_type,
                summary: `Live: ${msg.event!.event_type}`,
                architecture_changes: [],
                security_findings: [],
                ai_event: null,
                replay_link: null,
                timeline_position: null,
              };
              return {
                ...old,
                total_count: old.total_count + 1,
                results: [newResult, ...old.results],
              };
            });
          } else {
            void queryClient.invalidateQueries({ queryKey });
          }
        }
      },
    });
    return () => wsClient.close();
  }, [isDemo, projectId, queryClient, queryKey, queryStr]);

  // Demo mode: return static demo data after all hooks have been called
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
