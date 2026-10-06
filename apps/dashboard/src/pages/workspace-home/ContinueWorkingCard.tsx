/**
 * Continue Working — the natural next question once "what's happening now"
 * is answered (docs/design/PRODUCT_EXPERIENCE.md, Section 5, Workspace Home
 * #2). One session, one action: Resume.
 */

import { Link } from "react-router-dom";
import { Badge } from "@depradar/ui";
import { EmptyState } from "../../components/states";
import type { ContinueWorkingSession } from "./types";
import { formatRelativeTime } from "../../lib/relative-time";

const STATUS_BADGE = {
  ACTIVE: { variant: "success" as const, label: "Active" },
  IDLE: { variant: "warning" as const, label: "Idle" },
  COMPLETED: { variant: "default" as const, label: "Completed" },
};

export interface ContinueWorkingCardProps {
  session: ContinueWorkingSession | null;
}

export function ContinueWorkingCard({ session }: ContinueWorkingCardProps) {
  return (
    <section
      aria-labelledby="continue-working-heading"
      className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs rounded-lg border p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="continue-working-heading"
          className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider"
        >
          Continue Working
        </h2>
        {session && (
          <Badge variant={STATUS_BADGE[session.status].variant}>
            {STATUS_BADGE[session.status].label}
          </Badge>
        )}
      </div>

      {session ? (
        <>
          <p className="text-foreground mt-2 text-base font-bold leading-snug tracking-tight sm:text-lg">
            {session.headline}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">{session.projectName}</p>

          <dl className="border-border/60 mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-xs">
            <div>
              <dt className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">
                Duration
              </dt>
              <dd className="text-foreground mt-0.5 font-mono font-medium tabular-nums">
                {session.durationMinutes} min
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">
                Language
              </dt>
              <dd className="text-foreground mt-0.5 font-mono font-medium">
                {session.primaryLanguage}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">
                Last activity
              </dt>
              <dd className="text-foreground mt-0.5 font-mono font-medium">
                {formatRelativeTime(session.lastActivityAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <Link
              to={`/sessions/${session.id}`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring shadow-xs inline-flex h-8 items-center justify-center rounded-md px-3 font-mono text-xs font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1"
            >
              Resume
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          className="p-0 pt-4 text-left"
          title="No sessions yet"
          description="Start coding in an observed project and you'll be able to pick up right where you left off here."
        />
      )}
    </section>
  );
}
