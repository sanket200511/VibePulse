import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { toast } from "../../components/ui/ToastProvider";

export interface DeletedCounts {
  events: number;
  sessions: number;
  analyses: number;
  investigations: number;
  context: number;
}

export interface ProjectDeleteResponse {
  deleted: boolean;
  project_id: string;
  project_name: string;
  deleted_counts: DeletedCounts;
}

export interface DeleteProjectError {
  error: string;
  message: string;
  project_name?: string;
  project_root?: string;
  reason?: string;
}

export function useDeleteProject(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation<ProjectDeleteResponse, Error, string>({
    mutationFn: async (projectId: string) => {
      const response = await fetch(
        new URL(`/api/projects/${projectId}`, getApiBaseUrl()).toString(),
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        if (response.status === 409 && errorJson?.detail) {
          const detail = errorJson.detail as DeleteProjectError;
          const err = new Error(
            detail.message || "Project is currently active and cannot be deleted.",
          );
          (err as unknown as { isConflict: boolean; detail: DeleteProjectError }).isConflict = true;
          (err as unknown as { isConflict: boolean; detail: DeleteProjectError }).detail = detail;
          throw err;
        }
        throw new Error(errorJson?.detail || `Failed to delete project (${response.status})`);
      }

      return response.json();
    },
    onSuccess: (_data, projectId) => {
      toast.emit({
        title: "Project removed from DepRadar",
        description: "Your project files were not modified.",
        type: "ARCH",
      });

      // Invalidate relevant queries
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project_context", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project_sessions", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["investigation"] });

      options?.onSuccess?.();
    },
  });
}
