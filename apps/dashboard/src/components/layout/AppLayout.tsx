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

      <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8">
          <Link
            to="/"
            className="text-foreground hover:text-accent-color focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg text-sm font-extrabold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2"
            aria-label="DepRadar Workspace Home"
          >
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              DepRadar
            </span>
          </Link>
          <div className="flex items-center gap-4">
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
