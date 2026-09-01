import { useQuery, useMutation } from "@tanstack/react-query";
import type { CopilotResponse, CopilotEvidenceContext, CopilotSuggestion } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5184";

export function useCopilot(projectId?: string) {
  // Query mutation
  const queryMutation = useMutation<
    CopilotResponse,
    Error,
    { query: string; includeContext?: boolean }
  >({
    mutationFn: async ({ query, includeContext }) => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/copilot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, include_raw_context: includeContext ?? false }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Copilot query failed: ${res.statusText}`);
      }
      return res.json();
    },
  });

  // Dynamic state suggestions
  const suggestionsQuery = useQuery<CopilotSuggestion[]>({
    queryKey: ["copilot-suggestions", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/copilot/suggestions`);
      if (!res.ok) {
        throw new Error(`Failed to fetch copilot suggestions: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 15000,
  });

  // Full AI Context
  const contextQuery = useQuery<CopilotEvidenceContext>({
    queryKey: ["copilot-context", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/copilot/context`);
      if (!res.ok) {
        throw new Error(`Failed to fetch copilot context: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  return {
    askQuestion: queryMutation.mutateAsync,
    isAsking: queryMutation.isPending,
    lastResponse: queryMutation.data,
    queryError: queryMutation.error,
    resetQuery: queryMutation.reset,
    suggestions: suggestionsQuery.data || [],
    isLoadingSuggestions: suggestionsQuery.isLoading,
    contextPackage: contextQuery.data,
    isLoadingContext: contextQuery.isLoading,
  };
}
