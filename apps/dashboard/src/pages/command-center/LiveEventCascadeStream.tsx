import { useNavigate } from "react-router-dom";
import { FileCode, Search, ArrowRight, Radio, Clock, Sparkles } from "lucide-react";
import { Badge } from "@depradar/ui";
import type { LiveCascadeEvent } from "./useCommandCenter";
import type { UnifiedProjectHealth } from "../projects/useProjectHealth";
import type { SecurityIntelligence, SecurityFinding } from "../security/types";

interface Props {
  projectId: string;
  events: LiveCascadeEvent[];
  selectedEvent: LiveCascadeEvent | null;
  onSelectEvent: (id: string) => void;
  health: UnifiedProjectHealth | undefined;
  security: SecurityIntelligence | undefined;
  onInspectWhy?: (type: "security" | "health", id: string) => void;
}

export function LiveEventCascadeStream({
  projectId,
  events,
  selectedEvent,
  onSelectEvent,
  health,
  security,
  onInspectWhy,
}: Props) {
  const navigate = useNavigate();

  // Find findings corresponding to selected event's file path
  const relatedFindings: SecurityFinding[] = selectedEvent?.file_path
    ? security?.security_findings.filter(
        (f: SecurityFinding) => f.file_path === selectedEvent.file_path,
      ) || []
    : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* ── LEFT: LIVE EVENT STREAM ────────────────────────────────────────── */}
      <div className="space-y-2 lg:col-span-6">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            Live Event Stream
          </h3>
          <span className="text-muted-foreground font-mono text-[11px]">
            {events.length} events observed
          </span>
        </div>

        <div className="max-h-[440px] space-y-1.5 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="border-border/80 bg-card/40 text-muted-foreground rounded-lg border border-dashed p-5 text-center font-mono text-xs">
              Awaiting live filesystem events from Telemetry Daemon...
            </div>
          ) : (
            events.map((ev) => {
              const isSelected = selectedEvent?.id === ev.id;
              const hasFindings =
                security?.security_findings.some(
                  (f: SecurityFinding) => f.file_path === ev.file_path,
                ) || false;

              return (
                <button
                  key={ev.id}
                  onClick={() => onSelectEvent(ev.id)}
                  className={`w-full rounded-md border p-2.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-primary/50 bg-secondary/80 shadow-xs ring-primary/30 ring-1"
                      : "border-border/70 bg-secondary/30 hover:border-border hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <FileCode className="text-primary h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground truncate font-mono text-xs font-semibold">
                        {ev.file_path || "System Session"}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasFindings && (
                        <span className="flex h-1.5 w-1.5 animate-ping rounded-full bg-rose-500" />
                      )}
                      <Badge
                        variant="outline"
                        className="border-border/70 text-muted-foreground font-mono text-[9px]"
                      >
                        {ev.event_type}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-muted-foreground mt-1.5 flex items-center justify-between font-mono text-[10px]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <span>{ev.language || "General"}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: INTELLIGENCE CASCADE INSPECTOR ─────────────────────────── */}
      <div className="space-y-2 lg:col-span-6">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="text-primary h-3.5 w-3.5" />
            Causal Intelligence Cascade
          </h3>
          <Badge variant="outline" className="border-primary/25 text-primary font-mono text-[10px]">
            EVIDENCE-BACKED
          </Badge>
        </div>

        {selectedEvent ? (
          <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs space-y-2.5 rounded-lg border p-3.5">
            {/* Step 1: Observation */}
            <div className="space-y-0.5 rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase text-sky-400">
                  1. Raw Observation
                </span>
                <Badge
                  variant="outline"
                  className="border-sky-500/30 bg-sky-500/10 font-mono text-[9px] text-sky-400"
                >
                  OBSERVED
                </Badge>
              </div>
              <p className="text-foreground truncate font-mono text-xs font-semibold">
                {selectedEvent.file_path || "Session Observation"}
              </p>
              <p className="text-muted-foreground font-mono text-[10px] tabular-nums">
                Timestamp: {new Date(selectedEvent.timestamp).toISOString()}
              </p>
            </div>

            {/* Step 2: AST Detection */}
            <div className="space-y-1 rounded-md border border-rose-500/20 bg-rose-500/5 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase text-rose-400">
                  2. AST & Security Guardian
                </span>
                <span className="font-mono text-xs font-semibold text-rose-400">
                  {relatedFindings.length} Finding(s)
                </span>
              </div>
              {relatedFindings.length > 0 ? (
                relatedFindings.map((f: SecurityFinding) => (
                  <div
                    key={f.finding_id}
                    className="mt-1 space-y-0.5 border-t border-rose-500/20 pt-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground truncate font-mono text-xs font-semibold">
                        {f.title} ({f.rule_id})
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {onInspectWhy && (
                          <button
                            onClick={() => onInspectWhy("security", f.finding_id)}
                            className="text-primary font-mono text-[10px] font-medium hover:underline"
                          >
                            Why?
                          </button>
                        )}
                        <Badge
                          variant="outline"
                          className="border-rose-500/30 bg-rose-500/10 font-mono text-[9px] font-bold text-rose-400"
                        >
                          {f.severity}
                        </Badge>
                      </div>
                    </div>
                    {f.redacted_evidence && (
                      <pre className="overflow-x-auto rounded-md border border-rose-500/20 bg-black/60 p-1.5 font-mono text-[10px] text-rose-300">
                        {f.redacted_evidence}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-xs">
                  Zero static analysis violations detected in this event.
                </p>
              )}
            </div>

            {/* Step 3: Project Health Impact */}
            <div className="border-primary/20 bg-primary/5 space-y-0.5 rounded-md border p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-primary font-mono text-[10px] font-semibold uppercase">
                  3. Health & Priority Synthesis
                </span>
                <span className="text-foreground font-mono text-xs font-bold tabular-nums">
                  {health?.overall_health_score ?? "--"}/100
                </span>
              </div>
              <p className="text-muted-foreground font-mono text-xs">
                Security: {health?.security_health.score}/100 | Stability:{" "}
                {health?.engineering_stability.score}/100
              </p>
            </div>

            {/* Step 4: Action / Investigation Link */}
            <div className="pt-1.5 text-right">
              <button
                onClick={() => {
                  void navigate(
                    `/projects/${projectId}/investigation?incidentId=${encodeURIComponent(selectedEvent.id)}`,
                  );
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-medium transition"
              >
                <Search className="h-3 w-3" />
                Investigate in Engine 3.0
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-border/80 bg-card/40 text-muted-foreground rounded-lg border border-dashed p-6 text-center font-mono text-xs">
            Select an event from the stream to inspect its causal downstream intelligence.
          </div>
        )}
      </div>
    </div>
  );
}
