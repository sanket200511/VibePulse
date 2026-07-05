import { Badge } from "@vibepulse/ui";
import type { SessionOutcome } from "./timeline-types";

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export interface SessionOutcomeCardProps {
  outcome: SessionOutcome;
}

export function SessionOutcomeCard({ outcome }: SessionOutcomeCardProps) {
  const headline = (outcome.session_summary?.headline as string | undefined) ?? "Session outcome";

  return (
    <section className="border-border bg-card rounded-[16px] border p-6">
      <h2 className="text-foreground mb-4 text-lg font-semibold">{headline}</h2>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Duration</dt>
          <dd className="text-foreground text-sm font-medium">
            {formatDuration(outcome.duration_seconds)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Events</dt>
          <dd className="text-foreground text-sm font-medium">{outcome.event_count}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Files</dt>
          <dd className="text-foreground text-sm font-medium">{outcome.distinct_file_count}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Languages</dt>
          <dd className="flex flex-wrap gap-1">
            {Object.keys(outcome.languages).length === 0 && (
              <span className="text-foreground text-sm font-medium">—</span>
            )}
            {Object.entries(outcome.languages).map(([language, count]) => (
              <Badge key={language} variant="outline">
                {language} ({count})
              </Badge>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Largest change</dt>
          <dd className="text-foreground truncate font-mono text-sm">
            {outcome.largest_change
              ? `${outcome.largest_change.file_path} (${outcome.largest_change.event_count}×)`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">
            Primary language
          </dt>
          <dd className="text-foreground text-sm font-medium">{outcome.primary_language ?? "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
