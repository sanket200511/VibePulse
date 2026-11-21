import { useState, useEffect } from "react";
import { getApiBaseUrl } from "../../lib/api-config";
import { useAuth } from "../../lib/auth-context";
import { useCurrentSession } from "../../pages/sessions/useCurrentSession";
import {
  Download,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Wifi,
  X,
  Laptop,
  CheckCircle2,
} from "lucide-react";

interface ConnectDaemonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectDaemonModal({ isOpen, onClose }: ConnectDaemonModalProps) {
  const { user, token: authToken } = useAuth();
  const { connectionStatus } = useCurrentSession();
  const isDaemonConnected = connectionStatus === "open";

  const [daemonToken, setDaemonToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !authToken) return;

    let isMounted = true;
    setIsLoadingToken(true);

    const fetchDaemonToken = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/daemon-token`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { token: string };
          if (isMounted) {
            setDaemonToken(data.token);
          }
        }
      } catch (err) {
        console.error("Failed to load daemon token:", err);
      } finally {
        if (isMounted) {
          setIsLoadingToken(false);
        }
      }
    };

    void fetchDaemonToken();
    return () => {
      isMounted = false;
    };
  }, [isOpen, authToken]);

  if (!isOpen) return null;

  const handleCopyToken = () => {
    if (!daemonToken) return;
    void navigator.clipboard.writeText(daemonToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCmd = () => {
    if (!daemonToken) return;
    const cmd = `vibepulse-daemon.exe --token=${daemonToken}`;
    void navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Connect Local Telemetry Daemon</h2>
            <p className="text-xs text-zinc-400">
              Run the standalone desktop daemon on your PC to stream real-time code changes.
            </p>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="mt-4">
          {isDaemonConnected ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-3.5 py-2.5 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-medium">Daemon Connected & Actively Observing</span>
              </div>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                ONLINE
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-950/30 px-3.5 py-2 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5 text-amber-400" />
                <span>Awaiting connection from your local PC...</span>
              </div>
              <span className="font-mono text-[10px] text-amber-400/80">STANDBY</span>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="mt-5 space-y-4">
          {/* Step 1: Download Standalone Executable */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs font-bold text-cyan-400">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">
                    Download Standalone Daemon App
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Windows single-file executable. No Node.js or setup required.
                  </p>
                </div>
              </div>
              <a
                href="/downloads/vibepulse-daemon.exe"
                download="vibepulse-daemon.exe"
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .exe</span>
              </a>
            </div>
          </div>

          {/* Step 2: Copy Unique Account Token */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs font-bold text-cyan-400">
                2
              </span>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200">Your Unique Daemon Token</h3>
                <p className="text-[11px] text-zinc-400">
                  Associates all local project telemetry with account{" "}
                  <strong className="text-zinc-200">{user?.email}</strong>.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={
                    isLoadingToken
                      ? "Generating daemon token..."
                      : daemonToken || "Please log in to generate token"
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                disabled={!daemonToken || isLoadingToken}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Token</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Run Executable */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs font-bold text-cyan-400">
                3
              </span>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200">Launch Daemon on PC</h3>
                <p className="text-[11px] text-zinc-400">
                  Run <code className="text-cyan-400">vibepulse-daemon.exe</code> and paste your
                  token when prompted.
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  Quick CLI command
                </span>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  disabled={!daemonToken}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedCmd ? "Copied" : "Copy Command"}
                </button>
              </div>
              <code className="mt-1 block font-mono text-[11px] text-zinc-300">
                vibepulse-daemon.exe --token=
                {daemonToken ? `${daemonToken.slice(0, 16)}...` : "<token>"}
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-zinc-800/60 pt-4 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>End-to-end token authenticated telemetry</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
