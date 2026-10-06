/**
 * Implements the Contextual Navigation model (docs/design/PRODUCT_EXPERIENCE.md,
 * Section 4): a small, permanently stable anchor set — Workspace Home,
 * Projects, History — is always reachable. Nothing else lives here; Timeline,
 * Replay, Reflection, Health, and every future capability are reached
 * contextually from within Session Detail, never as additional items
 * competing for space in this list (see that document's "Alternatives
 * considered and rejected": a growing sidebar or top nav is exactly the
 * "generic SaaS dashboard" pattern this model exists to avoid).
 *
 * Rendered as a slim top bar rather than a persistent sidebar: three
 * anchors do not need — and should not imply — the kind of vertical,
 * feature-accreting chrome a sidebar invites.
 */

import { NavLink } from "react-router-dom";
import { cn } from "@depradar/ui";
import { NAV_ITEMS } from "./nav-items";

export function Navigation() {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end ?? false}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ease-out",
              "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1",
              isActive
                ? "bg-secondary text-foreground border-border/80 shadow-xs border"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent",
            )
          }
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {/* Icons support recognition rather than replace labels (Component
              Philosophy #6). `sr-only` below `sm` keeps the label out of
              view but still in the accessibility tree, so icon-only nav on
              mobile still has an accessible name — unlike `hidden`, which
              would remove it from screen readers too. */}
          <span className="sr-only sm:not-sr-only">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
