import * as React from "react";
import { cn } from "../lib/cn";

// ─── Variant definitions ──────────────────────────────────────────────────────

const variants = {
  variant: {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-secondary/20",
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    danger: "bg-red-500/10 text-red-500 border-red-500/20",
    outline: "border-border text-foreground",
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
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        "text-xs font-medium",
        variants.variant[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
