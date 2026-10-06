/**
 * Shared error state — explain what happened, suggest what can be done, stay
 * calm and free of technical jargon or blame (docs/design/UX_PRINCIPLES.md,
 * "Error States"; docs/design/COPY_GUIDELINES.md, "Error States").
 * `role="alert"` so assistive tech announces it as soon as it appears.
 */

import { cn } from "@depradar/ui";

export interface ErrorStateProps {
  /** What happened and what can be done, e.g. "We couldn't reach the API. Retrying in the background…". */
  message: string;
  className?: string;
}

export function ErrorState({ message, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-4 text-center font-mono text-xs leading-relaxed",
        className,
      )}
    >
      {message}
    </div>
  );
}
