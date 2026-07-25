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
    <section className="bg-card border-border flex flex-col justify-between gap-8 rounded-[24px] border p-6 shadow-sm md:flex-row md:items-center md:p-8">
      <div className="flex max-w-xl flex-col gap-2">
        <h2 className="text-secondary-text mb-1 text-sm font-bold uppercase tracking-widest">
          Session Footprint
        </h2>
        <div className="text-primary-text text-2xl font-medium leading-snug md:text-3xl">
          <span className="text-accent-color font-extrabold">{outcome.event_count}</span> events
          across{" "}
          <span className="text-accent-color font-extrabold">{outcome.distinct_file_count}</span>{" "}
          files during a{" "}
          <span className="text-accent-color font-extrabold">
            {formatDuration(outcome.duration_seconds)}
          </span>{" "}
          session.
        </div>
      </div>

      <div className="border-border/50 flex shrink-0 flex-col gap-5 border-l-2 pl-0 md:min-w-[280px] md:pl-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            Primary Language
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="text-primary-text font-semibold">
              {outcome.primary_language ?? "—"}
            </span>
            {Object.entries(outcome.languages)
              .filter(([l]) => l !== outcome.primary_language)
              .map(([language]) => (
                <span
                  key={language}
                  className="text-secondary-text border-border border-l pl-2 text-sm"
                >
                  {language}
                </span>
              ))}
          </div>
        </div>

        {outcome.largest_change && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              Largest Change
            </span>
            <span className="text-primary-text bg-muted-color/30 border-border break-all rounded border px-2 py-1 font-mono text-xs">
              {outcome.largest_change.file_path}{" "}
              <span className="text-accent-color ml-1">
                ({outcome.largest_change.event_count}×)
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
