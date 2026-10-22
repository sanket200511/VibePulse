import { useState, useEffect, useCallback, useRef } from "react";
import { getApiBaseUrl } from "./api-config";

export type BackendStatus = "idle" | "waking_up" | "ready" | "error";

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

  const probeBackend = useCallback(async () => {
    if (isResolvedRef.current) return;
    const start = performance.now();

    // Timeout controller for 4 seconds per attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      // If still pending after 2.5s and not yet marked waking up, show waking_up indicator
      if (!isResolvedRef.current) {
        setStatus("waking_up");
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
      }
      controller.abort();
    }, 4000);

    try {
      const res = await fetch(`${getApiBaseUrl()}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const duration = Math.round(performance.now() - start);
        setLatencyMs(duration);
        isResolvedRef.current = true;
        setStatus("ready");
        return;
      }
      // If 502, 503, or other temporary gateway error from Render during boot
      setStatus("waking_up");
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
    } catch {
      clearTimeout(timeoutId);
      // Fetch aborted or network connection refused while booting
      setStatus("waking_up");
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
    }
  }, []);

  // Initial probe and retry interval while waking up
  useEffect(() => {
    void probeBackend();

    const interval = setInterval(() => {
      if (!isResolvedRef.current) {
        void probeBackend();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [probeBackend]);

  // Timer for elapsed seconds
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
