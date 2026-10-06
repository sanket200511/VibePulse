import type { SessionOutcome } from "./timeline-types";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export interface SessionOutcomeCardProps {
  outcome: SessionOutcome;
}

export function SessionOutcomeCard({ outcome }: SessionOutcomeCardProps) {
  return (
    <section className="border-border/80 bg-card/60 shadow-xs flex flex-col justify-between gap-6 rounded-lg border p-4 sm:p-5 md:flex-row md:items-center">
      <div className="flex max-w-xl flex-col gap-1.5">
        <h2 className="text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
          Session Footprint
        </h2>
        <div className="text-foreground text-base font-medium leading-snug sm:text-lg">
          <span className="text-primary font-mono font-bold tabular-nums">
            {outcome.event_count}
          </span>{" "}
          events across{" "}
          <span className="text-primary font-mono font-bold tabular-nums">
            {outcome.distinct_file_count}
          </span>{" "}
          files during a{" "}
          <span className="text-primary font-mono font-bold tabular-nums">
            {formatDuration(outcome.duration_seconds)}
          </span>{" "}
          session.
        </div>
      </div>

      <div className="border-border/60 flex shrink-0 flex-col gap-3.5 border-t pt-3 md:min-w-[280px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
            Primary Language
          </span>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="border-primary/30 bg-primary/10 text-primary rounded-md border px-2 py-0.5 font-semibold">
              {outcome.primary_language ?? "—"}
            </span>
            {Object.entries(outcome.languages)
              .filter(([l]) => l !== outcome.primary_language)
              .map(([language]) => (
                <span
                  key={language}
                  className="border-border/60 bg-secondary/30 text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px]"
                >
                  {language}
                </span>
              ))}
          </div>
        </div>

        {outcome.largest_change && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              Largest Change
            </span>
            <span className="border-border/70 bg-secondary/30 text-foreground/90 break-all rounded-md border px-2 py-1 font-mono text-[11px]">
              {outcome.largest_change.file_path}{" "}
              <span className="text-primary font-bold tabular-nums">
                ({outcome.largest_change.event_count}×)
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
