import React, { useState, useEffect } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";
import { Cloud, RefreshCw, LogIn } from "lucide-react";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    const isWakingUp = elapsed >= 3;
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="border-border bg-card text-card-foreground flex w-full max-w-sm flex-col items-center rounded-2xl border p-6 text-center shadow-lg">
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
            {isWakingUp ? (
              <>
                <Cloud className="text-primary h-7 w-7 animate-pulse" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="bg-primary/75 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                  <span className="bg-primary relative inline-flex h-3 w-3 rounded-full" />
                </span>
              </>
            ) : (
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            )}
          </div>

          <h3 className="text-foreground text-sm font-semibold">
            {isWakingUp ? "Waking Up Cloud Engine" : "Authenticating Session"}
          </h3>

          <p className="text-muted-foreground mt-1.5 text-xs">
            {isWakingUp
              ? "Render free-tier instances sleep after inactivity. Spinning up container..."
              : "Verifying your VibePulse session credentials..."}
          </p>

          {isWakingUp && (
            <div className="mt-4 flex w-full flex-col gap-3">
              <div className="border-border/80 bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-1.5 font-mono text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="text-primary h-3 w-3 animate-spin" />
                  Elapsed:
                </span>
                <span className="text-foreground font-semibold">{elapsed}s (~30-45s typical)</span>
              </div>

              {elapsed >= 10 && (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 text-xs underline underline-offset-4 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Cancel & go to login</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
