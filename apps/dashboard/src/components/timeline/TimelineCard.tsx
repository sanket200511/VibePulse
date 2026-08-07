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
    <div className="group relative pl-14">
      {/* Icon Node */}
      <div className="absolute left-2 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 transition-colors group-focus-within:border-indigo-500/50 group-hover:border-indigo-500/50">
        <EventIcon eventType={event.eventType} />
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 shadow-lg backdrop-blur-sm transition-all focus-within:ring-1 focus-within:ring-indigo-500 hover:border-zinc-700 hover:bg-zinc-900/60">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-white">{event.title}</h3>
              {event.language && (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {event.language}
                </span>
              )}
            </div>
            {event.description && <p className="mt-1 text-sm text-zinc-400">{event.description}</p>}
            {event.filePath && (
              <p className="mt-1 font-mono text-sm text-zinc-500">{event.filePath}</p>
            )}
          </div>
          <span className="whitespace-nowrap font-mono text-xs text-zinc-500">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>

        {/* AI Observation */}
        {event.aiObservation && (
          <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
            <h4 className="mb-1 flex items-center gap-2 text-xs font-bold text-indigo-400">
              <Bot className="h-3.5 w-3.5" /> AI Provenance
            </h4>
            <p className="text-sm text-indigo-200">
              {event.aiObservation.provider} {event.aiObservation.model} •{" "}
              {event.aiObservation.interactionType || "Observation"}
            </p>
          </div>
        )}

        {/* Architecture Changes */}
        {event.architectureChanges.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <Layers className="h-3.5 w-3.5" /> Architecture Changes
            </h4>
            <ul className="space-y-1">
              {event.architectureChanges.map((arc, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="font-mono text-xs text-amber-400/80">{arc.kind}</span>
                  <span>{arc.symbol}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Security Findings */}
        {event.securityFindings.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-bold text-rose-500">
              <ShieldAlert className="h-3.5 w-3.5" /> Security Findings
            </h4>
            <ul className="space-y-1">
              {event.securityFindings.map((sec, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded border border-rose-500/10 bg-rose-500/5 p-2 text-sm text-rose-200"
                >
                  <span className="font-bold">{sec.severity}</span>
                  <span>{sec.ruleId}</span>
                  <span className="ml-2 truncate text-xs text-rose-200/60" title={sec.message}>
                    {sec.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shortcuts */}
        <div className="mt-5 flex flex-wrap gap-4 border-t border-zinc-800/50 pt-4">
          {event.replayUrl && (
            <button
              onClick={() => {
                void navigate(event.replayUrl!);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 focus-visible:underline focus-visible:outline-none"
              aria-label={`Launch replay for ${event.title}`}
            >
              <PlayCircle className="h-3.5 w-3.5" /> Replay
            </button>
          )}
          {event.dnaUrl && (
            <button
              onClick={() => {
                void navigate(event.dnaUrl!);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300 focus-visible:underline focus-visible:outline-none"
              aria-label={`View Engineering DNA for ${event.filePath}`}
            >
              <Dna className="h-3.5 w-3.5" /> DNA
            </button>
          )}
          {event.timeMachineUrl && (
            <Link
              to={event.timeMachineUrl}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:underline focus-visible:outline-none"
              aria-label={`View Time Machine for ${event.title}`}
            >
              <Clock className="h-3.5 w-3.5" /> Timeline
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
