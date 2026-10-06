/**
 * The application shell — the one persistent frame every screen renders
 * inside. Owns exactly three things: the skip link, the header (wordmark +
 * primary Navigation), and the scrollable content region each page renders
 * into via `<Outlet />`. Nothing feature-specific belongs here; see
 * docs/architecture/DASHBOARD_SHELL.md for the boundary between this shell
 * and the pages it hosts.
 */

import { Outlet, Link } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ThemeToggle } from "../theme/ThemeToggle";
import { PresentationToggle } from "./PresentationToggle";
import { useLiveObservability } from "../../lib/useLiveObservability";
import { ToastProvider } from "../ui/ToastProvider";

export function AppLayout() {
  useLiveObservability();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      {/* Visible only on keyboard focus — lets keyboard/screen-reader users
          bypass the header and land directly in page content. */}
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only rounded-[8px] px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:ring-2"
      >
        Skip to content
      </a>

      <header className="border-border/80 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="flex h-12 items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="text-foreground hover:text-primary focus-visible:ring-ring inline-flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2"
            aria-label="DepRadar Workspace Home"
          >
            <span className="bg-primary/15 text-primary flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-bold">
              D
            </span>
            <span className="text-foreground font-semibold tracking-tight">DepRadar</span>
            <span className="bg-muted/40 text-muted-foreground border-border/50 hidden items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] md:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              v1.0
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Navigation />
            <PresentationToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <ToastProvider />
    </div>
  );
}
