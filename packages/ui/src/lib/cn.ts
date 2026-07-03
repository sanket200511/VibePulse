import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging Tailwind class names safely.
 * Prevents conflicting classes and handles conditional logic.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
