import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectKnowledgeGraph,
  FileIntelligenceView,
  SubsystemIntelligenceView,
  GraphSearchResult,
  GraphEdgeExplanation,
  GraphTraversalResponse,
  GraphTimelineResponse,
  BeforeAfterComparisonResponse,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5184";

export function useKnowledgeGraph(projectId?: string) {
  const queryClient = useQueryClient();

  const graphQuery = useQuery<ProjectKnowledgeGraph>({
    queryKey: ["knowledge-graph", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/knowledge-graph`);
      if (!res.ok) {
        throw new Error(`Failed to fetch knowledge graph: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 10000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/knowledge-graph/refresh`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to refresh knowledge graph: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["knowledge-graph", projectId], data);
    },
  });

  return {
    graph: graphQuery.data,
    isLoading: graphQuery.isLoading,
    error: graphQuery.error,
    refreshGraph: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
  };
}

export function useEdgeExplanation(projectId?: string, relationshipId?: string | null) {
  return useQuery<GraphEdgeExplanation>({
    queryKey: ["edge-explanation", projectId, relationshipId],
    queryFn: async () => {
      if (!projectId || !relationshipId) throw new Error("Missing params");
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/knowledge-graph/edges/${encodeURIComponent(relationshipId)}/explain`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch edge explanation: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && !!relationshipId,
  });
}

export function useRootCauseTraversal(projectId?: string, startNode?: string | null) {
  return useQuery<GraphTraversalResponse>({
    queryKey: ["root-cause-traversal", projectId, startNode],
    queryFn: async () => {
      if (!projectId || !startNode) throw new Error("Missing params");
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/knowledge-graph/trace/root-cause?start_node=${encodeURIComponent(startNode)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to trace root cause: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && !!startNode,
  });
}

export function useImpactTraversal(projectId?: string, startNode?: string | null) {
  return useQuery<GraphTraversalResponse>({
    queryKey: ["impact-traversal", projectId, startNode],
    queryFn: async () => {
      if (!projectId || !startNode) throw new Error("Missing params");
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/knowledge-graph/trace/impact?start_node=${encodeURIComponent(startNode)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to trace impact: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && !!startNode,
  });
}

export function useGraphTimeline(projectId?: string) {
  return useQuery<GraphTimelineResponse>({
    queryKey: ["graph-timeline", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/knowledge-graph/timeline`);
      if (!res.ok) {
        throw new Error(`Failed to fetch timeline: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useBeforeAfterComparison(projectId?: string) {
  return useQuery<BeforeAfterComparisonResponse>({
    queryKey: ["graph-before-after", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/knowledge-graph/before-after`);
      if (!res.ok) {
        throw new Error(`Failed to fetch before-after comparison: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useFileIntelligence(projectId?: string, filePath?: string | null) {
  return useQuery<FileIntelligenceView>({
    queryKey: ["file-intelligence", projectId, filePath],
    queryFn: async () => {
      if (!projectId || !filePath) throw new Error("Missing params");
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/knowledge-graph/files/${encodeURIComponent(filePath)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch file intelligence: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && !!filePath,
  });
}

export function useSubsystemIntelligence(projectId?: string, subsystemName?: string | null) {
  return useQuery<SubsystemIntelligenceView>({
    queryKey: ["subsystem-intelligence", projectId, subsystemName],
    queryFn: async () => {
      if (!projectId || !subsystemName) throw new Error("Missing params");
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/knowledge-graph/subsystems/${encodeURIComponent(subsystemName)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch subsystem intelligence: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && !!subsystemName,
  });
}

export function useGraphSearch(projectId?: string, query?: string) {
  return useQuery<GraphSearchResult[]>({
    queryKey: ["graph-search", projectId, query],
    queryFn: async () => {
      if (!projectId || !query || !query.trim()) return [];
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/knowledge-graph/search?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to search knowledge graph: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && !!query && query.trim().length > 0,
  });
}
