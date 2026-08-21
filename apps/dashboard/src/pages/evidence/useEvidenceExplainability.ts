import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { EntityExplainabilityResponse, EntityType } from "./types";

export function useEvidenceExplainability(
  projectId: string | undefined,
  entityType: EntityType | null,
  entityId: string | null,
) {
  return useQuery<EntityExplainabilityResponse>({
    queryKey: ["evidence-explainability", projectId, entityType, entityId],
    queryFn: async () => {
      if (!projectId || !entityType) {
        throw new Error("projectId and entityType are required");
      }
      const targetId = entityId || "current";
      const url = new URL(
        `/api/projects/${projectId}/evidence/${entityType}/${targetId}`,
        getApiBaseUrl(),
      ).toString();

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load evidence explainability (${res.status})`);
      }
      return res.json() as Promise<EntityExplainabilityResponse>;
    },
    enabled: !!projectId && !!entityType,
  });
}
