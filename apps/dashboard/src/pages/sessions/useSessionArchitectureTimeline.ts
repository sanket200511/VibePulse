import { useQuery } from "@tanstack/react-query";

export interface ArchitectureTimelineEntry {
  id: string;
  timestamp: string;
  kind: string;
  title: string;
  description: string | null;
  related_file: string | null;
  related_event_id: string | null;
  analysis_reference: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW" | null;
}

export interface ArchitectureTimeline {
  session_id: string;
  generated_at: string;
  entries: ArchitectureTimelineEntry[];
}

export function useSessionArchitectureTimeline(sessionId: string) {
  const { data, isLoading, isError, error } = useQuery<ArchitectureTimeline>({
    queryKey: ["session_architecture", sessionId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/sessions/${sessionId}/architecture`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch architecture timeline");
      }
      return res.json();
    },
    enabled: !!sessionId,
  });

  return { timeline: data, isLoading, isError, error };
}
