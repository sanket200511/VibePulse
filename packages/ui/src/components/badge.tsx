import * as React from "react";
import { cn } from "../lib/cn";

// ─── Variant definitions ──────────────────────────────────────────────────────

const variants = {
  variant: {
    default: "bg-primary/10 text-primary border-primary/25",
    secondary: "bg-secondary/40 text-secondary-foreground border-border/80",
    success: "bg-green-500/10 text-emerald-400 border-green-500/25",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    danger: "bg-red-500/10 text-rose-400 border-red-500/25",
    outline: "border-border/80 text-foreground/90 bg-transparent",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants.variant;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
        "font-mono text-[11px] font-medium leading-none tracking-tight",
        variants.variant[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
