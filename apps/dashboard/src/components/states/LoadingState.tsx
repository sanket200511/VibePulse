/**
 * Shared loading state — skeletons over spinners wherever layout is known in
 * advance (docs/design/MOTION.md, "Skeleton Loading"), since they preserve
 * layout stability and reduce perceived waiting. `label` should describe what
 * is happening (docs/design/COPY_GUIDELINES.md, "Loading" tone), never a bare
 * "Loading...".
 */

import { cn } from "@depradar/ui";

export interface LoadingStateProps {
  /** What is happening, e.g. "Preparing your development story…". */
  label: string;
  className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("flex flex-col gap-2 p-4 sm:p-6", className)}
    >
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="bg-muted/60 h-3.5 w-1/4 animate-pulse rounded-md" />
        <div className="bg-muted/40 border-border/40 h-16 w-full animate-pulse rounded-md border" />
      </div>
    </div>
  );
}
