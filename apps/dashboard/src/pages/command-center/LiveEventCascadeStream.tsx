import { useNavigate } from "react-router-dom";
import { FileCode, Search, ArrowRight, Radio, Clock, Sparkles } from "lucide-react";
import { Badge } from "@vibepulse/ui";
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* ── LEFT: LIVE EVENT STREAM ────────────────────────────────────────── */}
      <div className="space-y-3 lg:col-span-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
            Live Event Stream
          </h3>
          <span className="font-mono text-xs text-gray-500">{events.length} events observed</span>
        </div>

        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/40 p-6 text-center text-xs text-gray-500">
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
                  className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-indigo-500/80 bg-indigo-950/40 shadow-md ring-1 ring-indigo-500/30"
                      : "border-gray-800 bg-gray-950/70 hover:border-gray-700 hover:bg-gray-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                      <span className="max-w-[220px] truncate font-mono text-xs font-bold text-white">
                        {ev.file_path || "System Session"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasFindings && (
                        <span className="flex h-2 w-2 animate-ping rounded-full bg-rose-500" />
                      )}
                      <Badge
                        variant="outline"
                        className="border-gray-700 font-mono text-[9px] text-gray-400"
                      >
                        {ev.event_type}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
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
      <div className="space-y-3 lg:col-span-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Causal Intelligence Cascade
          </h3>
          <Badge variant="outline" className="border-indigo-500/30 text-[10px] text-indigo-300">
            EVIDENCE-BACKED
          </Badge>
        </div>

        {selectedEvent ? (
          <div className="space-y-3.5 rounded-xl border border-gray-800 bg-gray-950/80 p-4">
            {/* Step 1: Observation */}
            <div className="space-y-1 rounded-lg border border-blue-900/40 bg-blue-950/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-blue-400">
                  1. Raw Observation
                </span>
                <Badge
                  variant="outline"
                  className="border-blue-700/60 bg-blue-950 text-[9px] text-blue-300"
                >
                  OBSERVED
                </Badge>
              </div>
              <p className="font-mono text-xs font-bold text-white">
                {selectedEvent.file_path || "Session Observation"}
              </p>
              <p className="text-[10px] text-gray-400">
                Timestamp: {new Date(selectedEvent.timestamp).toISOString()}
              </p>
            </div>

            {/* Step 2: AST Detection */}
            <div className="space-y-1 rounded-lg border border-rose-900/40 bg-rose-950/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-rose-400">
                  2. AST & Security Guardian
                </span>
                <span className="font-mono text-xs font-bold text-rose-300">
                  {relatedFindings.length} Finding(s)
                </span>
              </div>
              {relatedFindings.length > 0 ? (
                relatedFindings.map((f: SecurityFinding) => (
                  <div
                    key={f.finding_id}
                    className="mt-1 space-y-0.5 border-t border-rose-900/30 pt-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">
                        {f.title} ({f.rule_id})
                      </span>
                      <div className="flex items-center gap-1.5">
                        {onInspectWhy && (
                          <button
                            onClick={() => onInspectWhy("security", f.finding_id)}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                          >
                            Why?
                          </button>
                        )}
                        <Badge
                          variant="outline"
                          className="border-rose-600/50 text-[9px] font-bold text-rose-400"
                        >
                          {f.severity}
                        </Badge>
                      </div>
                    </div>
                    {f.redacted_evidence && (
                      <pre className="overflow-x-auto rounded bg-black/50 p-1.5 font-mono text-[10px] text-rose-300">
                        {f.redacted_evidence}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">
                  Zero static analysis violations detected in this event.
                </p>
              )}
            </div>

            {/* Step 3: Project Health Impact */}
            <div className="space-y-1 rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-indigo-400">
                  3. Health & Priority Synthesis
                </span>
                <span className="font-mono text-xs font-bold text-indigo-300">
                  {health?.overall_health_score ?? "--"}/100
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Security Health: {health?.security_health.score}/100 | Stability:{" "}
                {health?.engineering_stability.score}/100
              </p>
            </div>

            {/* Step 4: Action / Investigation Link */}
            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  void navigate(`/projects/${projectId}/investigation`);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-500"
              >
                <Search className="h-3.5 w-3.5" />
                Investigate in Engine 3.0
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/40 p-8 text-center text-xs text-gray-500">
            Select an event from the stream to inspect its causal downstream intelligence.
          </div>
        )}
      </div>
    </div>
  );
}
