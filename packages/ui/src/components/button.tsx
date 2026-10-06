import * as React from "react";
import { cn } from "../lib/cn";

// ─── Variant definitions ──────────────────────────────────────────────────────

const variants = {
  variant: {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border border-primary/40",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    ghost: "hover:bg-accent/70 hover:text-foreground text-muted-foreground",
    danger:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/30",
    outline:
      "border border-border bg-card/60 hover:bg-accent/60 hover:text-foreground text-foreground shadow-sm",
  },
  size: {
    sm: "h-7 px-2.5 text-xs",
    md: "h-8 px-3.5 text-xs font-semibold",
    lg: "h-9 px-5 text-sm font-semibold",
    icon: "h-8 w-8",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants.variant;
  size?: keyof typeof variants.size;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading}
        className={cn(
          // Base
          "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md",
          "font-medium transition-all duration-150 ease-out active:scale-[0.98]",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          // Variant + size
          variants.variant[variant],
          variants.size[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
