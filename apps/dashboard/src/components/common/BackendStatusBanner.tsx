import { useState, useEffect } from "react";
import { useBackendWakeup } from "../../lib/useBackendWakeup";
import { Cloud, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export function BackendStatusBanner() {
  const { status, elapsedSeconds, latencyMs, retryNow } = useBackendWakeup();
  const [showReadyBriefly, setShowReadyBriefly] = useState(false);
  const [wasWaking, setWasWaking] = useState(false);

  useEffect(() => {
    if (status === "waking_up") {
      setWasWaking(true);
      return undefined;
    }
    if (status === "ready" && wasWaking) {
      setShowReadyBriefly(true);
      const timer = setTimeout(() => {
        setShowReadyBriefly(false);
        setWasWaking(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, wasWaking]);

  if (status === "idle" || (status === "ready" && !showReadyBriefly)) {
    return null;
  }

  if (status === "waking_up") {
    return (
      <div className="relative z-50 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/70 via-zinc-950/90 to-amber-950/70 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <Cloud className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="font-medium">
              Waking up Render cloud engine... Free tier instances sleep after inactivity.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
              Elapsed: {elapsedSeconds}s (typically ~25-45s)
            </span>
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
          </div>
        </div>
        {/* Animated shimmer bar */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden bg-amber-500/10">
          <div className="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] bg-amber-400/60" />
        </div>
      </div>
    );
  }

  if (showReadyBriefly) {
    return (
      <div className="relative z-50 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/70 via-zinc-950/90 to-emerald-950/70 px-4 py-1.5 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-medium">Cloud backend online and ready!</span>
          {latencyMs !== null && (
            <span className="py-0.2 rounded bg-emerald-500/20 px-1.5 font-mono text-[10px] text-emerald-300">
              {latencyMs}ms
            </span>
          )}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="relative z-50 border-b border-rose-500/20 bg-rose-950/80 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span>Cloud engine is taking longer than usual to boot.</span>
          </div>
          <button
            type="button"
            onClick={retryNow}
            className="flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/30"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
