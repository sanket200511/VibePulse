/**
 * Shared empty state — every empty state must explain why it's empty and
 * what to do next (docs/design/UX_PRINCIPLES.md, "Empty States"); never a
 * bare "No data". `title` names what's missing, `description` explains why
 * and how to populate it, and `action` (optional) is the one concrete next
 * step, when there is one.
 */

import type { ReactNode } from "react";
import { cn } from "@depradar/ui";
import { FileQuestion } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  footer,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border/70 bg-card/30 animate-fade-in-up flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center sm:py-12",
        className,
      )}
    >
      <div className="bg-secondary/60 border-border/70 shadow-xs text-muted-foreground mb-3 flex h-10 w-10 items-center justify-center rounded-md border">
        {icon ?? <FileQuestion className="h-5 w-5" />}
      </div>
      <h3 className="text-foreground mb-1 text-sm font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-[380px] text-xs leading-relaxed">
        {description}
      </p>

      {action && <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>}

      {footer && (
        <div className="text-muted-foreground/70 mt-4 font-mono text-[11px]">{footer}</div>
      )}
    </div>
  );
}
