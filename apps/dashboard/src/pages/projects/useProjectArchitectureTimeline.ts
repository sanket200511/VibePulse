import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { ArchitectureTimeline } from "../sessions/useSessionArchitectureTimeline";
import { useDemoMode } from "../../demo/config";

// We can reuse ArchitectureTimeline type from sessions since the structure is the same,
// it just contains project_id instead of session_id at the top level
export interface ProjectArchitectureTimeline extends Omit<ArchitectureTimeline, "session_id"> {
  project_id: string;
}

export function useProjectArchitectureTimeline(projectId: string) {
  const { isDemo } = useDemoMode();

  const { data, isLoading, isError, error } = useQuery<ProjectArchitectureTimeline>({
    queryKey: ["project_architecture", projectId],
    queryFn: async () => {
      if (isDemo) {
        // Return empty or mock demo data if needed. For now, empty timeline.
        return {
          project_id: projectId,
          generated_at: new Date().toISOString(),
          entries: [],
        };
      }

      const res = await fetch(
        new URL(`/api/projects/${projectId}/architecture`, getApiBaseUrl()).toString(),
      );
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch project architecture timeline");
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  return { timeline: data, isLoading, isError, error };
}
