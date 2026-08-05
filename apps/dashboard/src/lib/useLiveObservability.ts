import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getWsUrl } from "./api-config";
import { connectWs } from "./ws-client";

interface WsEventMessage {
  id?: string;
  event_type?: string;
  project_root?: string;
  session_id?: string;
  project_id?: string;
  type?: string;
  entries?: Record<string, unknown>[];
}

interface WsSessionMessage {
  type: string;
  session: {
    id: string;
    project_id?: string;
    status: string;
  };
}

export function useLiveObservability() {
  const queryClient = useQueryClient();

  // Listen to the Events WebSocket
  useEffect(() => {
    const client = connectWs({
      url: getWsUrl("/ws/events"),
      onMessage: (data) => {
        void (async () => {
          const payload = data as WsEventMessage;

          // If it's an analysis completion event or standard event
          const sessionId = payload.session_id;
          const eventId = payload.id;

          // Analysis Complete branch (live intelligent append)
          if (
            payload.type === "ANALYSIS_COMPLETE" &&
            payload.entries &&
            payload.entries.length > 0
          ) {
            const { toast } = await import("../components/ui/ToastProvider");

            for (const entry of payload.entries || []) {
              const isSecurity = entry.kind === "SECURITY_FINDING";
              toast.emit({
                type: isSecurity ? "SECURITY" : "ARCH",
                title: entry.title as string,
                description: entry.description as string | null,
              });
            }

            // Intelligently append to timelines if they are mounted, rather than invalidate fully
            if (sessionId) {
              queryClient.setQueryData(
                ["session_architecture", sessionId],
                (old: { entries: Record<string, unknown>[] } | undefined) => {
                  if (!old) return old;
                  return { ...old, entries: [...old.entries, ...payload.entries!] };
                },
              );
              // Update project architecture if mounted
              // We can't know projectId easily here unless we look it up, but we can invalidate it
              void queryClient.invalidateQueries({ queryKey: ["project_architecture"] });
              void queryClient.invalidateQueries({ queryKey: ["event_analysis", eventId] });
              void queryClient.invalidateQueries({ queryKey: ["sessions", sessionId, "replay"] });
              void queryClient.invalidateQueries({ queryKey: ["engineering-dna"] });
            }
            return; // Done
          }

          // Standard raw event (pre-analysis)
          void queryClient.invalidateQueries({ queryKey: ["workspace_intelligence"] });
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          void queryClient.invalidateQueries({ queryKey: ["project_intelligence"] });
          void queryClient.invalidateQueries({ queryKey: ["project"] });
          void queryClient.invalidateQueries({ queryKey: ["engineering-dna"] });

          if (sessionId) {
            void queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
          }
        })();
      },
    });

    return () => client.close();
  }, [queryClient]);

  // Listen to the Sessions WebSocket
  useEffect(() => {
    const client = connectWs({
      url: getWsUrl("/ws/sessions"),
      onMessage: (data) => {
        const payload = data as WsSessionMessage;
        const sessionId = payload.session?.id;

        void queryClient.invalidateQueries({ queryKey: ["sessions"] });
        void queryClient.invalidateQueries({ queryKey: ["current_session"] });
        void queryClient.invalidateQueries({ queryKey: ["workspace_intelligence"] });
        void queryClient.invalidateQueries({ queryKey: ["projects"] });
        void queryClient.invalidateQueries({ queryKey: ["project_intelligence"] });
        void queryClient.invalidateQueries({ queryKey: ["project"] });
        if (sessionId) {
          void queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
          void queryClient.invalidateQueries({ queryKey: ["session_architecture", sessionId] });
        }
      },
    });

    return () => client.close();
  }, [queryClient]);
}
