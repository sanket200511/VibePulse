import { useNavigate, Link } from "react-router-dom";
import { Bot, ShieldAlert, Layers, PlayCircle, Dna, Clock, FileText, Zap } from "lucide-react";
import type { CanonicalEventViewModel } from "../../lib/events/viewModel";

export function EventIcon({ eventType }: { eventType: string }) {
  if (eventType.startsWith("AI_")) return <Bot className="h-4 w-4 text-indigo-400" />;
  if (eventType === "SECURITY_FINDING") return <ShieldAlert className="h-4 w-4 text-rose-400" />;
  if (eventType.includes("SESSION")) return <Clock className="h-4 w-4 text-zinc-400" />;
  if (
    eventType.includes("FUNCTION") ||
    eventType.includes("CLASS") ||
    eventType.includes("IMPORT")
  ) {
    return <Layers className="h-4 w-4 text-amber-400" />;
  }
  if (eventType.startsWith("FILE_")) return <FileText className="h-4 w-4 text-emerald-400" />;
  return <Zap className="text-accent-color h-4 w-4" />;
}

export interface TimelineCardProps {
  event: CanonicalEventViewModel;
}

export function TimelineCard({ event }: TimelineCardProps) {
  const navigate = useNavigate();

  return (
    <div className="group relative pl-11">
      {/* Icon Node */}
      <div className="border-border/80 bg-card text-muted-foreground group-focus-within:border-primary/50 group-hover:border-primary/50 group-hover:text-foreground absolute left-1.5 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md border transition-colors">
        <EventIcon eventType={event.eventType} />
      </div>

      <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs focus-within:ring-primary/40 hover:border-border hover:bg-card/90 rounded-lg border p-3.5 transition-all focus-within:ring-1 sm:p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-foreground text-sm font-semibold tracking-tight">
                {event.title}
              </h3>
              {event.language && (
                <span className="border-border/70 bg-secondary/50 py-0.2 text-muted-foreground rounded-md border px-1.5 font-mono text-[10px]">
                  {event.language}
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {event.description}
              </p>
            )}
            {event.filePath && (
              <p className="text-muted-foreground/80 mt-1 truncate font-mono text-[11px]">
                {event.filePath}
              </p>
            )}
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>

        {/* AI Observation */}
        {event.aiObservation && (
          <div className="border-primary/20 bg-primary/5 mt-2.5 rounded-md border p-2 text-xs">
            <h4 className="text-primary mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold">
              <Bot className="h-3 w-3" /> AI Provenance
            </h4>
            <p className="text-foreground/80 font-mono text-[11px]">
              {event.aiObservation.provider} {event.aiObservation.model} •{" "}
              {event.aiObservation.interactionType || "Observation"}
            </p>
          </div>
        )}

        {/* Architecture Changes */}
        {event.architectureChanges.length > 0 && (
          <div className="mt-2.5 space-y-1">
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
              <Layers className="h-3 w-3" /> Architecture Changes
            </h4>
            <ul className="space-y-0.5">
              {event.architectureChanges.map((arc, i) => (
                <li key={i} className="text-foreground/90 flex items-center gap-1.5 text-xs">
                  <span className="py-0.2 rounded border border-amber-500/20 bg-amber-500/10 px-1 font-mono text-[10px] text-amber-400/90">
                    {arc.kind}
                  </span>
                  <span className="font-mono text-[11px]">{arc.symbol}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Security Findings */}
        {event.securityFindings.length > 0 && (
          <div className="mt-2.5 space-y-1">
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400">
              <ShieldAlert className="h-3 w-3" /> Security Findings
            </h4>
            <ul className="space-y-1">
              {event.securityFindings.map((sec, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 p-1.5 font-mono text-xs text-rose-300"
                >
                  <span className="text-[10px] font-bold uppercase text-rose-400">
                    {sec.severity}
                  </span>
                  <span className="text-[11px]">{sec.ruleId}</span>
                  <span className="ml-1 truncate text-[11px] text-rose-300/70" title={sec.message}>
                    {sec.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shortcuts */}
        <div className="border-border/50 mt-3 flex flex-wrap gap-3 border-t pt-2.5">
          {event.replayUrl && (
            <button
              onClick={() => {
                void navigate(event.replayUrl!);
              }}
              className="flex items-center gap-1 font-mono text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 focus-visible:underline focus-visible:outline-none"
              aria-label={`Launch replay for ${event.title}`}
            >
              <PlayCircle className="h-3 w-3" /> Replay
            </button>
          )}
          {event.dnaUrl && (
            <button
              onClick={() => {
                void navigate(event.dnaUrl!);
              }}
              className="text-primary hover:text-primary/80 flex items-center gap-1 font-mono text-xs font-medium transition-colors focus-visible:underline focus-visible:outline-none"
              aria-label={`View Engineering DNA for ${event.filePath}`}
            >
              <Dna className="h-3 w-3" /> DNA
            </button>
          )}
          {event.timeMachineUrl && (
            <Link
              to={event.timeMachineUrl}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono text-xs font-medium transition-colors focus-visible:underline focus-visible:outline-none"
              aria-label={`View Time Machine for ${event.title}`}
            >
              <Clock className="h-3 w-3" /> Timeline
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
