import { Badge, Button } from "@vibepulse/ui";

/**
 * Sprint 0 placeholder.
 * Real dashboard layout and data will be implemented in Sprint 1.
 */
export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      {/* ── Logo mark ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <span className="text-3xl" aria-hidden="true">
            ⚡
          </span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">VibePulse</h1>
          <Badge variant="default">Sprint 0</Badge>
        </div>

        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Developer Observability Platform for the AI Coding Era
        </p>
      </div>

      {/* ── Status cards ───────────────────────────────────────────────────── */}
      <div className="grid w-full max-w-lg grid-cols-3 gap-4">
        {[
          { label: "Dashboard", status: "Running", color: "success" as const },
          { label: "API", status: "Running", color: "success" as const },
          { label: "Daemon", status: "Running", color: "success" as const },
        ].map(({ label, status, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-[16px] border border-border bg-card p-4"
          >
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <Badge variant={color}>{status}</Badge>
          </div>
        ))}
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <Button
        variant="primary"
        onClick={() => window.open("http://localhost:8000/docs", "_blank")}
      >
        View API Docs
      </Button>

      <p className="text-xs text-muted-foreground">
        Repository foundation complete · Sprint 1 coming next
      </p>
    </main>
  );
}
