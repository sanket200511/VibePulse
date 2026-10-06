/**
 * Shared page header — every screen states its own purpose first (Context
 * First, docs/design/UX_PRINCIPLES.md §5): a title, an optional one-line
 * description, and an optional slot for a status badge or primary action.
 * Every screen has exactly one of these, at the top, so a developer never
 * has to guess where they are.
 */

import type { ReactNode } from "react";
import { cn } from "@depradar/ui";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Status badge, primary action, or similar — rendered at the header's trailing edge. */
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "border-border/40 mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3 sm:mb-5 sm:pb-4",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h1 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
        {description && <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>}
      </div>
      {meta && <div className="flex shrink-0 items-center gap-2">{meta}</div>}
    </header>
  );
}
