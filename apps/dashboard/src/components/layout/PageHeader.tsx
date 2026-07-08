/**
 * Shared page header — every screen states its own purpose first (Context
 * First, docs/design/UX_PRINCIPLES.md §5): a title, an optional one-line
 * description, and an optional slot for a status badge or primary action.
 * Every screen has exactly one of these, at the top, so a developer never
 * has to guess where they are.
 */

import type { ReactNode } from "react";
import { cn } from "@vibepulse/ui";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Status badge, primary action, or similar — rendered at the header's trailing edge. */
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {meta && <div className="flex shrink-0 items-center gap-3">{meta}</div>}
    </header>
  );
}
