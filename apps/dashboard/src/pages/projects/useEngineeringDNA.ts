import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { EngineeringDNARead } from "./types";

export function useEngineeringDNA(projectId: string | undefined, fileId: string | undefined) {
  const encodedFileId = fileId ? encodeURIComponent(fileId) : "";

  const query = useQuery<EngineeringDNARead>({
    queryKey: ["engineering-dna", projectId, encodedFileId],
    queryFn: async () => {
      if (!projectId || !encodedFileId) throw new Error("Missing required parameters");
      const url = new URL(`/projects/${projectId}/files/${encodedFileId}/dna`, getApiBaseUrl());
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Failed to fetch Engineering DNA");
      }
      return res.json();
    },
    enabled: !!projectId && !!encodedFileId,
  });

  return query;
}
