/**
 * Shared empty state — every empty state must explain why it's empty and
 * what to do next (docs/design/UX_PRINCIPLES.md, "Empty States"); never a
 * bare "No data". `title` names what's missing, `description` explains why
 * and how to populate it, and `action` (optional) is the one concrete next
 * step, when there is one.
 */

import type { ReactNode } from "react";
import { cn } from "@vibepulse/ui";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 p-8 text-center", className)}>
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
