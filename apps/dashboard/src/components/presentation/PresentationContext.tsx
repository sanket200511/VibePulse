import { createContext, useContext } from "react";
import type { PresentationState } from "./types";

export const PresentationContext = createContext<PresentationState | null>(null);

export function usePresentation() {
  const ctx = useContext(PresentationContext);
  if (!ctx) {
    throw new Error("usePresentation must be used within PresentationProvider");
  }
  return ctx;
}
