import { useState, useEffect } from "react";
import { getApiBaseUrl } from "../../lib/api-config";
import { useOptionalAuth } from "../../lib/auth-context";
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
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const authToken = auth?.token ?? null;
  const { session, connectionStatus } = useCurrentSession();
  const isDaemonConnected =
    connectionStatus === "open" &&
    session !== null &&
    (session.status === "ACTIVE" || session.status === "IDLE");

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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-150">
      <div className="border-border bg-card text-card-foreground relative w-full max-w-xl rounded-2xl border p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 rounded-lg p-1.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="border-primary/20 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl border">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-semibold">
              Connect Local Telemetry Daemon
            </h2>
            <p className="text-muted-foreground text-xs">
              Run the standalone desktop daemon on your PC to stream real-time code changes.
            </p>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="mt-4">
          {isDaemonConnected ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-400">
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
            <div className="border-border/80 bg-muted/40 text-muted-foreground flex items-center justify-between rounded-xl border px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Wifi className="text-muted-foreground h-3.5 w-3.5" />
                <span>Awaiting connection from your local PC...</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider">STANDBY</span>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="mt-5 space-y-4">
          {/* Step 1: Download Standalone Executable */}
          <div className="border-border/80 bg-secondary/30 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="border-primary/25 bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold">
                  1
                </span>
                <div>
                  <h3 className="text-foreground text-xs font-semibold">
                    Download Standalone Daemon App
                  </h3>
                  <p className="text-muted-foreground text-[11px]">
                    Windows single-file executable. No Node.js or setup required.
                  </p>
                </div>
              </div>
              <a
                href="https://github.com/sanket200511/VibePulse/releases/latest/download/vibepulse-daemon.exe"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 shadow-xs inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .exe (79.6 MB)</span>
              </a>
            </div>
          </div>

          {/* Step 2: Copy Unique Account Token */}
          <div className="border-border/80 bg-secondary/30 rounded-xl border p-4">
            <div className="flex items-center gap-2.5">
              <span className="border-primary/25 bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold">
                2
              </span>
              <div>
                <h3 className="text-foreground text-xs font-semibold">Your Unique Daemon Token</h3>
                <p className="text-muted-foreground text-[11px]">
                  Associates all local project telemetry with account{" "}
                  <strong className="text-foreground">{user?.email}</strong>.
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
                  className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                disabled={!daemonToken || isLoadingToken}
                className="border-border bg-secondary hover:bg-secondary/80 text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
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
          <div className="border-border/80 bg-secondary/30 rounded-xl border p-4">
            <div className="flex items-center gap-2.5">
              <span className="border-primary/25 bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold">
                3
              </span>
              <div>
                <h3 className="text-foreground text-xs font-semibold">Launch Daemon on PC</h3>
                <p className="text-muted-foreground text-[11px]">
                  Run <code className="text-primary">vibepulse-daemon.exe</code> and paste your
                  token when prompted.
                </p>
              </div>
            </div>

            <div className="border-border bg-background/80 mt-3 rounded-lg border p-2.5 text-xs">
              <div className="text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Terminal className="text-primary h-3.5 w-3.5" />
                  Quick CLI command
                </span>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  disabled={!daemonToken}
                  className="text-primary hover:text-primary/80 text-[11px]"
                >
                  {copiedCmd ? "Copied" : "Copy Command"}
                </button>
              </div>
              <code className="text-foreground mt-1 block font-mono text-[11px]">
                vibepulse-daemon.exe --token=
                {daemonToken ? `${daemonToken.slice(0, 16)}...` : "<token>"}
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border/60 text-muted-foreground mt-6 flex items-center justify-between border-t pt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="text-primary h-4 w-4" />
            <span>End-to-end token authenticated telemetry</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-border bg-secondary hover:bg-secondary/80 text-foreground rounded-lg border px-4 py-1.5 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
