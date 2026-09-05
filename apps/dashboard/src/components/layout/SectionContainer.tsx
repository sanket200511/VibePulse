/**
 * Shared section container — the card-shaped grouping unit used throughout
 * the dashboard (Component Philosophy #2, docs/design/PRODUCT_EXPERIENCE.md:
 * "Cards group meaningfully related information"). An optional `title` keeps
 * progressively-disclosed sections (e.g. within Session Detail) self-labeled
 * without every caller re-deriving the same border/radius/padding.
 */

import type { ReactNode } from "react";
import { cn } from "@depradar/ui";

export interface SectionContainerProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SectionContainer({ title, children, className }: SectionContainerProps) {
  return (
    <section className={cn("border-border bg-card rounded-[16px] border p-6", className)}>
      {title && <h2 className="text-foreground mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
