/**
 * Shared loading state — skeletons over spinners wherever layout is known in
 * advance (docs/design/MOTION.md, "Skeleton Loading"), since they preserve
 * layout stability and reduce perceived waiting. `label` should describe what
 * is happening (docs/design/COPY_GUIDELINES.md, "Loading" tone), never a bare
 * "Loading...".
 */

import { cn } from "@vibepulse/ui";

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
      className={cn("flex flex-col gap-3 p-8", className)}
    >
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="bg-muted h-4 w-1/3 animate-pulse rounded-[8px]" />
        <div className="bg-muted h-20 w-full animate-pulse rounded-[12px]" />
      </div>
    </div>
  );
}
