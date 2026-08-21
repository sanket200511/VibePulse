import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { SecurityIntelligence } from "./types";

export function useSecurityIntelligence(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["project_security_intelligence", projectId],
    queryFn: async (): Promise<SecurityIntelligence> => {
      if (!projectId) throw new Error("projectId is required");
      const url = new URL(`/api/projects/${projectId}/security`, getApiBaseUrl()).toString();
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load security intelligence (${res.status})`);
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  const refreshMutation = useMutation({
    mutationFn: async (): Promise<SecurityIntelligence> => {
      if (!projectId) throw new Error("projectId is required");
      const url = new URL(
        `/api/projects/${projectId}/security/refresh`,
        getApiBaseUrl(),
      ).toString();
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Failed to refresh security intelligence (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["project_security_intelligence", projectId], data);
    },
  });

  return {
    security: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
  };
}
