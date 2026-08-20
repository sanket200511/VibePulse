import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { ProjectContext } from "./types";

export function useProjectContext(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const contextQuery = useQuery({
    queryKey: ["project_context", projectId],
    queryFn: async (): Promise<ProjectContext> => {
      if (!projectId) throw new Error("Project ID required");
      const response = await fetch(
        new URL(`/api/projects/${projectId}/context`, getApiBaseUrl()).toString(),
      );
      if (!response.ok) {
        if (response.status === 404) throw new Error("Project not found");
        throw new Error(`Failed to load project context (${response.status})`);
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 10_000,
  });

  const refreshMutation = useMutation({
    mutationFn: async (): Promise<ProjectContext> => {
      if (!projectId) throw new Error("Project ID required");
      const response = await fetch(
        new URL(`/api/projects/${projectId}/context/refresh`, getApiBaseUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to refresh project context (${response.status})`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["project_context", projectId], data);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!projectId) throw new Error("Project ID required");
      const exportUrl = new URL(
        `/api/projects/${projectId}/context/export?format=markdown&refresh=true`,
        getApiBaseUrl(),
      ).toString();

      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`Failed to export project context (${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "PROJECT_CONTEXT.md";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      // Invalidate context to display latest analysis timestamps
      void queryClient.invalidateQueries({ queryKey: ["project_context", projectId] });
    },
  });

  return {
    context: contextQuery.data,
    isLoading: contextQuery.isLoading,
    isError: contextQuery.isError,
    error: contextQuery.error,
    refreshContext: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
    exportContext: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    isExportSuccess: exportMutation.isSuccess,
  };
}
