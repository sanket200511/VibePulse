/**
 * Continue Working — the natural next question once "what's happening now"
 * is answered (docs/design/PRODUCT_EXPERIENCE.md, Section 5, Workspace Home
 * #2). One session, one action: Resume.
 */

import { Link } from "react-router-dom";
import { Badge } from "@vibepulse/ui";
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
      className="border-border bg-card rounded-[16px] border p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="continue-working-heading"
          className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
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
          <p className="text-foreground mt-3 text-xl font-semibold leading-snug sm:text-2xl">
            {session.headline}
          </p>
          <p className="text-muted-foreground mt-1.5 text-sm">{session.projectName}</p>

          <dl className="border-border mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t pt-6 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Duration</dt>
              <dd className="text-foreground mt-0.5 font-medium">{session.durationMinutes} min</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Language</dt>
              <dd className="text-foreground mt-0.5 font-medium">{session.primaryLanguage}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                Last activity
              </dt>
              <dd className="text-foreground mt-0.5 font-medium">
                {formatRelativeTime(session.lastActivityAt)}
              </dd>
            </div>
          </dl>

          <Link
            to={`/sessions/${session.id}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-7 inline-flex h-10 items-center justify-center rounded-[12px] px-5 text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Resume
          </Link>
        </>
      ) : (
        <EmptyState
          className="p-0 pt-6 text-left"
          title="No sessions yet"
          description="Start coding in an observed project and you'll be able to pick up right where you left off here."
        />
      )}
    </section>
  );
}
