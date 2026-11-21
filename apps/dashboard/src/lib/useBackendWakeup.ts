import { useState, useEffect, useCallback, useRef } from "react";
import { getApiBaseUrl } from "./api-config";

export type BackendStatus = "idle" | "waking_up" | "ready" | "error";

export const BACKEND_READY_EVENT = "vibepulse:backend_ready";

/**
 * Dispatches a global event indicating that the backend is awake and responding.
 * Can be called by any successful API or WebSocket connection.
 */
export function notifyBackendReady(latencyMs?: number): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(BACKEND_READY_EVENT, {
        detail: { latencyMs: latencyMs ?? null },
      }),
    );
  }
}

interface BackendWakeupState {
  status: BackendStatus;
  elapsedSeconds: number;
  latencyMs: number | null;
  retryNow: () => void;
}

export function useBackendWakeup(): BackendWakeupState {
  const [status, setStatus] = useState<BackendStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const isResolvedRef = useRef<boolean>(false);
  const isProbingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const wakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markReady = useCallback((latency: number | null) => {
    if (isResolvedRef.current) return;
    isResolvedRef.current = true;
    if (wakingTimeoutRef.current) {
      clearTimeout(wakingTimeoutRef.current);
      wakingTimeoutRef.current = null;
    }
    setLatencyMs(latency);
    setStatus("ready");
  }, []);

  // Listen to ready signals dispatched across the app
  useEffect(() => {
    isMountedRef.current = true;
    const handleReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ latencyMs?: number | null }>;
      markReady(customEvent.detail?.latencyMs ?? null);
    };

    window.addEventListener(BACKEND_READY_EVENT, handleReady);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener(BACKEND_READY_EVENT, handleReady);
    };
  }, [markReady]);

  const probeBackend = useCallback(async () => {
    if (isResolvedRef.current || isProbingRef.current) return;
    isProbingRef.current = true;
    const start = performance.now();

    // Show waking_up banner if backend takes more than 2.5s to respond
    if (!wakingTimeoutRef.current && status === "idle") {
      wakingTimeoutRef.current = setTimeout(() => {
        if (!isResolvedRef.current && isMountedRef.current) {
          setStatus("waking_up");
          if (!startTimeRef.current) {
            startTimeRef.current = Date.now();
          }
        }
      }, 2500);
    }

    // 15-second timeout for the health fetch itself (gives Render free tier spin-up time to reply)
    const controller = new AbortController();
    const abortTimeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(abortTimeout);

      if (res.ok) {
        const duration = Math.round(performance.now() - start);
        markReady(duration);
        return;
      }

      // If temporary gateway error (502, 503) during cold boot
      if (isMountedRef.current && !isResolvedRef.current && status !== "error") {
        setStatus("waking_up");
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
      }
    } catch {
      clearTimeout(abortTimeout);
      // Connection refused, timeout or network error while booting
      if (isMountedRef.current && !isResolvedRef.current && status !== "error") {
        setStatus("waking_up");
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
      }
    } finally {
      isProbingRef.current = false;
    }
  }, [markReady, status]);

  // Sequential retry loop: wait 3 seconds after each probe completes before retrying
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const runProbeLoop = async () => {
      if (cancelled || isResolvedRef.current) return;
      if (status !== "error") {
        await probeBackend();
      }
      if (!cancelled && !isResolvedRef.current && status !== "error") {
        timeoutId = setTimeout(() => {
          void runProbeLoop();
        }, 3000);
      }
    };

    void runProbeLoop();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (wakingTimeoutRef.current) {
        clearTimeout(wakingTimeoutRef.current);
        wakingTimeoutRef.current = null;
      }
    };
  }, [probeBackend, status]);

  // Timer for elapsed seconds while waking up
  useEffect(() => {
    if (status !== "waking_up") return;

    const timer = setInterval(() => {
      if (startTimeRef.current) {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(sec);
        if (sec > 90) {
          setStatus("error");
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const retryNow = useCallback(() => {
    isResolvedRef.current = false;
    isProbingRef.current = false;
    startTimeRef.current = Date.now();
    setStatus("waking_up");
    setElapsedSeconds(0);
    void probeBackend();
  }, [probeBackend]);

  return {
    status,
    elapsedSeconds,
    latencyMs,
    retryNow,
  };
}
