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
        "border-border/60 bg-muted/20 animate-fade-in-up flex w-full flex-col items-center justify-center rounded-[16px] border border-dashed px-8 py-16 text-center",
        className,
      )}
    >
      <div className="bg-background border-border/50 mb-6 flex h-16 w-16 items-center justify-center rounded-full border shadow-sm">
        {icon ?? <FileQuestion className="text-muted-foreground/80 h-7 w-7" />}
      </div>
      <h3 className="text-foreground mb-2 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-[420px] text-sm leading-relaxed">
        {description}
      </p>

      {action && <div className="mb-4 flex flex-col items-center gap-4 sm:flex-row">{action}</div>}

      {footer && <div className="text-muted-foreground/80 mt-6 text-xs">{footer}</div>}
    </div>
  );
}
